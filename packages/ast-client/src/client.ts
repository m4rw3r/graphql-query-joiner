import type {
  EmptyObject,
  GraphQLResponse,
  GraphQLError,
  RenameMap,
} from "./query";
import type { QueryBundle } from "./bundle";
import type {
  ResultOf,
  TypedDocumentNode,
  VariablesOf,
} from "@graphql-typed-document-node/core";

import { print } from "graphql/language";
import { createBundle, createDocument, mergeBundle } from "./bundle";
import {
  missingVariableError,
  parseError,
  queryError,
  requestError,
} from "./error";

type ResolveFn<T> = (value: T) => void;
type RejectFn = (error: unknown) => void;

/**
 * Type resolving to a list with a single optional parameter if the supplied
 * type is undefined/void/strict-empty-object, otherwise it is a requried
 * parameter.
 *
 * We manually split them to make TypeScript consider exactly undefined for
 * the undefined case, otherwise undefined as T here will result in a mandatory
 * parameter.
 */
export type OptionalParameterIfEmpty<T> = undefined extends T
  ? [variables?: EmptyObject | undefined]
  : T extends EmptyObject
    ? [variables?: EmptyObject | undefined]
    : [variables: T];

/**
 * A function which takes a GraphQL query along with its required variables,
 * if any, and returns a promise which resolves to the query result.
 */
export type Client = <O extends TypedDocumentNode<any, any>>(
  operation: O,
  // This construction makes the variables parameter optional if P is void or
  // EmptyObject.
  ...args: OptionalParameterIfEmpty<VariablesOf<O>>
) => Promise<ResultOf<O>>;

/**
 * Options for createClient().
 */
export interface CreateClientOptions {
  /**
   * Function which receives the prepared queries and variables to execute.
   *
   * It is expected to throw if the request fails or the response is not a
   * GraphQL Response.
   */
  runOperation: RunOperation;
  /**
   * Time-window for grouping queries together.
   */
  debounce?: number;
}

/**
 * Interface for a function which runs a GraphQL operation.
 */
export type RunOperation = (
  operation: PreparedOperation,
) => Promise<GraphQLResponse<unknown>>;

/**
 * An operation which has been serialized and grouped with its variables.
 */
export interface PreparedOperation {
  // TODO: Maybe expose it as a AST instead?
  /**
   * Printed operation.
   */
  operation: string;
  /**
   * Variables and their values.
   */
  variables: Record<string, unknown>;
}

/**
 * @internal
 */
export interface Group {
  bundle: QueryBundle;
  variables: Record<string, unknown>;
  queries: GroupedQuery[];
}

/**
 * @internal
 */
export interface GroupedQuery {
  renamedFields: RenameMap;
  resolve: ResolveFn<unknown>;
  reject: RejectFn;
}

/**
 * @internal
 */
export interface GroupedQueryWithError extends GroupedQuery {
  errors: GraphQLError[];
}

const resolved = new Promise<void>((resolve) => {
  resolve(undefined);
});

function setVariable(
  variables: Record<string, unknown>,
  parameters: unknown,
  nameInAst: string,
  nameInQuery: string,
): void {
  if (
    typeof parameters === "object" &&
    parameters &&
    Object.prototype.hasOwnProperty.call(parameters, nameInAst)
  ) {
    // SAFETY: If we are requesting variables and pass these checks, we can
    // assume it is a correct variable typed based on the Query/Mutation
    variables[nameInQuery] = (parameters as Record<string, unknown>)[nameInAst];
  } else {
    throw missingVariableError(nameInAst);
  }
}

function createGroup<R>(
  bundle: QueryBundle,
  parameters: unknown,
  resolve: ResolveFn<R>,
  reject: RejectFn,
): Group {
  const variables = {};
  const firstBundleFields: Record<string, string> = {};

  for (const [k] of bundle.variables) {
    setVariable(variables, parameters, k, k);
  }

  for (const [k] of bundle.fields) {
    firstBundleFields[k] = k;
  }

  return {
    bundle,
    variables,
    queries: [
      {
        renamedFields: firstBundleFields,
        // SAFETY: We will only call this in runGroup() with data extracted
        // from the fields above
        resolve: resolve as ResolveFn<unknown>,
        reject,
      },
    ],
  };
}

/**
 * ContentType for GraphQL responses are either
 * application/json, or application/graphql-response+json.
 * Encoding can also be present.
 *
 * See https://github.com/graphql/graphql-over-http/blob/main/spec/GraphQLOverHTTP.md
 */
const CONTENT_TYPE_JSON = /application\/.*json/i;

/**
 * Handles a fetch-Response and parses it into a GraphQLResponse,
 * throws if the request is not ok or if JSON fails to parse.
 */
export async function handleFetchResponse<R>(response: Response): Promise<R> {
  const contentType = response.headers.get("Content-Type");
  const bodyText = await response.text();

  if (!CONTENT_TYPE_JSON.test(contentType ?? "")) {
    throw requestError(
      response,
      bodyText,
      !response.ok
        ? `Received status ${response.status} ${response.statusText}`
        : `Unexpected Content-Type ${contentType}`,
    );
  }

  let data: Record<string, unknown>;

  try {
    data = JSON.parse(bodyText) as Record<string, unknown>;
  } catch (error) {
    throw parseError(response, bodyText, error);
  }

  if (
    ("errors" in data && Array.isArray(data.errors)) ||
    ("data" in data && typeof data.data === "object")
  ) {
    // SAFETY: Since it is successful with data and/or errors we assume we
    // have GraphQL-data in the correct format:
    return data as R;
  }

  throw requestError(
    response,
    bodyText,
    `Received unexpected JSON body content: ${bodyText}`,
  );
}

/**
 * @internal
 */
export function enqueue<R>(
  pending: Group[],
  newBundle: QueryBundle,
  parameters: unknown,
  resolve: ResolveFn<R>,
  reject: RejectFn,
): void {
  const last = pending[pending.length - 1];

  if (last && last.bundle.operation === newBundle.operation) {
    // Merge the queries since their types match
    const { bundle, renamedVariables, renamedFields } = mergeBundle(
      last.bundle,
      newBundle,
    );
    last.bundle = bundle;

    for (const [k, v] of Object.entries(renamedVariables)) {
      setVariable(last.variables, parameters, k, v);
    }

    last.queries.push({
      renamedFields,
      // SAFETY: We will only call this in runGroup() with data extracted
      // from the fields above
      resolve: resolve as ResolveFn<unknown>,
      reject,
    });
  } else {
    pending.push(createGroup(newBundle, parameters, resolve, reject));
  }
}

/**
 * Matches errors into groups based on their path.
 *
 * If an error is not in any of the supplied groups then it is assigned to all
 * of them.
 *
 * @internal
 */
export function groupErrors<T extends { renamedFields: RenameMap }>(
  errors: GraphQLError[],
  groups: T[],
): (T & { errors: GraphQLError[] })[] {
  const groupsWithErrors = groups.map((group) => ({
    ...group,
    // TODO: Maybe use something more efficent
    errors: errors.filter(
      (error) =>
        Array.isArray(error.path) &&
        error.path.length > 0 &&
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        Object.values(group.renamedFields).includes(error.path[0]!),
    ),
  }));

  // We need to make sure that errors without a path also gets propagated
  const missingErrors = errors.filter(
    (error) => !groupsWithErrors.some((g) => g.errors.includes(error)),
  );

  groupsWithErrors.forEach((group) => group.errors.push(...missingErrors));

  return groupsWithErrors;
}

/**
 * @internal
 */
export async function runGroup(
  runOperation: RunOperation,
  { bundle, variables, queries }: Group,
): Promise<void> {
  try {
    const bundledResponse = await runOperation({
      operation: print(createDocument(bundle)),
      variables,
    });

    for (const { renamedFields, resolve, reject, errors } of groupErrors(
      bundledResponse.errors ?? [],
      queries,
    )) {
      const data: Record<string, unknown> = {};

      if ("data" in bundledResponse) {
        for (const [k, v] of Object.entries(renamedFields)) {
          // SAFETY: Since we have a data-field we assume that it contains
          // the requested keys
          data[k] = (bundledResponse.data as Record<string, unknown>)[v];
        }
      }

      if (errors.length > 0) {
        reject(queryError(errors, data));
      } else {
        resolve(data);
      }
    }
  } catch (e) {
    for (const { reject } of queries) {
      reject(e);
    }
  }
}

/**
 * @internal
 */
export function runGroups(
  runOperation: RunOperation,
  groups: Group[],
): Promise<void> {
  return groups.reduce(
    (p, group) => p.then(() => runGroup(runOperation, group)),
    resolved,
  );
}

// TODO: Rewrite as class
/**
 * Creates a graphql-client.
 */
export function createClient({
  runOperation,
  debounce = 50,
}: CreateClientOptions): Client {
  let next = resolved;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Group[] = [];

  const fire = (): void => {
    // TODO: Control how this chaining is done?
    next = next.then((): Promise<void> => {
      const r = runGroups(runOperation, pending);

      // Clear now that we fired off stuff
      pending = [];
      timer = undefined;

      return r;
    });
  };

  // TODO: Do we make the consumer wrap the created Client in a cache if to
  // provide caching?
  return <O extends TypedDocumentNode<any, any>>(
    operation: O,
    // VariablesOf<O> or empty object, but empty object is more permissive
    variables?: EmptyObject,
  ): Promise<ResultOf<O>> =>
    new Promise((resolve, reject): void => {
      enqueue(pending, createBundle(operation), variables, resolve, reject);

      timer ??= setTimeout(fire, debounce);
    });
}
