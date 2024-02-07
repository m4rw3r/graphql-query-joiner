import type { GraphQLResponse, GraphQLError, Query, RenameMap } from "./query";
import type { QueryBundle } from "./bundle";

import { print } from "graphql/language";
import { createBundle, createDocument, mergeBundle } from "./bundle";
import {
  missingVariableError,
  parseError,
  queryError,
  requestError,
} from "./error";

export type QueryRunner = (query: {
  query: string;
  variables: Record<string, unknown>;
}) => Promise<GraphQLResponse<unknown>>;

export type ClientArgs = {
  runQuery: QueryRunner;
  debounce?: number;
};

export type Client<O> = <P, R>(
  query: Query<P, R>,
  variables: P,
  options?: Readonly<O>,
) => Promise<R>;

type ResolveFn<T> = (value: T) => void;
type RejectFn = (error: unknown) => void;

export type Group = {
  bundle: QueryBundle;
  variables: Record<string, unknown>;
  queries: Array<GroupedQuery>;
};

export type GroupedQuery = {
  renamedFields: RenameMap;
  resolve: ResolveFn<unknown>;
  reject: RejectFn;
};

export type GroupedQueryWithError = GroupedQuery & {
  errors: Array<GraphQLError>;
};

const resolved: Promise<void> = new Promise((resolve) => resolve(undefined));

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
    // assume it is a correct variable typed based on the Query
    variables[nameInQuery] = (parameters as Record<string, unknown>)[nameInAst];
  } else {
    throw missingVariableError(nameInAst);
  }
}

function createGroup<P, R>(
  bundle: QueryBundle,
  parameters: P,
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
 * Handles a fetch-Response and parses it into a GraphQLResponse,
 * throws if the request is not ok or if JSON fails to parse.
 */
export async function handleFetchResponse<R>(response: Response): Promise<R> {
  const bodyText = await response.text();

  if (!response.ok) {
    throw requestError(
      response,
      bodyText,
      `Received status code ${response.status}`,
    );
  }

  try {
    // SAFETY: Since it is successful we assume we have GraphQL-data in the
    // correct format
    return JSON.parse(bodyText) as R;
  } catch (error) {
    throw parseError(response, bodyText, error);
  }
}

export function enqueue<P, R>(
  pending: Array<Group>,
  newBundle: QueryBundle,
  parameters: P,
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
 */
export function groupErrors<T extends { renamedFields: RenameMap }>(
  errors: Array<GraphQLError>,
  groups: Array<T>,
): Array<T & { errors: Array<GraphQLError> }> {
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

export async function runGroup(
  runQuery: QueryRunner,
  { bundle, variables, queries }: Group,
): Promise<void> {
  try {
    const bundledResponse = await runQuery({
      query: print(createDocument(bundle)),
      variables,
    });

    for (const { renamedFields, resolve, reject, errors } of groupErrors(
      bundledResponse.errors || [],
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
    queries.forEach(({ reject }) => reject(e));
  }
}

export function runGroups(
  runQuery: QueryRunner,
  groups: Array<Group>,
): Promise<void> {
  return groups.reduce(
    (p, group) => p.then(() => runGroup(runQuery, group)),
    resolved,
  );
}

// TODO: Rewrite as class
export function createClient({
  runQuery,
  debounce = 50,
}: ClientArgs): Client<object> {
  let next = resolved;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Array<Group> = [];

  const fire = (): void => {
    // TODO: Control how this chaining is done?
    next = next.then((): Promise<void> => {
      const r = runGroups(runQuery, pending);

      // Clear now that we fired off stuff
      pending = [];
      timer = undefined;

      return r;
    });
  };

  return <P, R>(query: Query<P, R>, parameters: P): Promise<R> =>
    new Promise<R>((resolve: ResolveFn<R>, reject: RejectFn): void => {
      enqueue(pending, createBundle(query), parameters, resolve, reject);

      if (!timer) {
        timer = setTimeout(fire, debounce);
      }
    });
}
