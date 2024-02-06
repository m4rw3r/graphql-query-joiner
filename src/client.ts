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

export type Client<O> = <P extends {}, R extends {}>(
  query: Query<P, R>,
  variables: P,
  options?: Readonly<O>,
) => Promise<R>;

type ResolveFn<T> = (value: T) => void;
type RejectFn = (error: Error) => void;

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

export const resolved: Promise<void> = new Promise(
  (resolve: ResolveFn<void>): void => resolve(undefined),
);

const setVariable = (
  variables: Record<string, unknown>,
  parameters: unknown,
  nameInAst: string,
  nameInQuery: string,
): void => {
  if (
    typeof parameters === "object" &&
    parameters &&
    parameters.hasOwnProperty(nameInAst)
  ) {
    variables[nameInQuery] = (parameters as Record<string, unknown>)[nameInAst];
  } else {
    throw missingVariableError(nameInAst);
  }
};

const createGroup = <P, R>(
  bundle: QueryBundle,
  parameters: P,
  resolve: ResolveFn<R>,
  reject: RejectFn,
): Group => {
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
        resolve: resolve as any,
        reject,
      },
    ],
  };
};

/**
 * Handles a fetch-Response and parses it into a GraphQLResponse,
 * throws if the request is not ok or if JSON fails to parse.
 */
export const handleFetchResponse = <R>(response: Response): Promise<R> =>
  response.text().then((bodyText: string): R => {
    if (!response.ok) {
      throw requestError(
        response,
        bodyText,
        `Received status code ${response.status}`,
      );
    }

    try {
      // Since it is successful we assume we have GraphQL-data
      return JSON.parse(bodyText);
    } catch (error) {
      throw parseError(response, bodyText, error);
    }
  });

export const enqueue = <P, R>(
  pending: Array<Group>,
  newBundle: QueryBundle,
  parameters: P,
  resolve: ResolveFn<R>,
  reject: RejectFn,
): void => {
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
      resolve: resolve as any,
      reject,
    });
  } else {
    pending.push(createGroup(newBundle, parameters, resolve, reject));
  }
};

/**
 * Matches errors into groups based on their path.
 *
 * If an error is not in any of the supplied groups then it is assigned to all
 * of them.
 */
export const groupErrors = <T extends { renamedFields: RenameMap }>(
  errors: Array<GraphQLError>,
  groups: Array<T>,
): Array<T & { errors: Array<GraphQLError> }> => {
  const groupsWithErrors = groups.map((group) => ({
    ...group,
    // TODO: Maybe use something more efficent
    errors: errors.filter(
      (error) =>
        Array.isArray(error.path) &&
        error.path.length > 0 &&
        Object.values(group.renamedFields).includes(error.path[0]!),
    ),
  }));

  // We need to make sure that errors without a path also gets propagated
  const missingErrors = errors.filter(
    (error) => !groupsWithErrors.some((g) => g.errors.includes(error)),
  );

  groupsWithErrors.forEach((group) => group.errors.push(...missingErrors));

  return groupsWithErrors;
};

export const runGroup = (
  runQuery: QueryRunner,
  { bundle, variables, queries }: Group,
): Promise<void> =>
  runQuery({
    query: print(createDocument(bundle)),
    variables,
  }).then(
    (bundledResponse: GraphQLResponse<any>): void => {
      for (const { renamedFields, resolve, reject, errors } of groupErrors(
        bundledResponse.errors || [],
        queries,
      )) {
        const data: Record<string, unknown> = {};

        if ("data" in bundledResponse) {
          for (const [k, v] of Object.entries(renamedFields)) {
            data[k] = bundledResponse.data[v];
          }
        }

        if (errors.length > 0) {
          reject(queryError(errors, data));
        } else {
          resolve(data);
        }
      }
    },
    (error: Error): void =>
      queries.forEach(({ reject }: { reject: RejectFn }): void =>
        reject(error),
      ),
  );

export const runGroups = (
  runQuery: QueryRunner,
  groups: Array<Group>,
): Promise<void> =>
  groups.reduce(
    (p: Promise<void>, group: Group): Promise<void> =>
      p.then((): Promise<void> => runGroup(runQuery, group)),
    resolved,
  );

export const createClient = ({
  runQuery,
  debounce = 50,
}: ClientArgs): Client<{}> => {
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

  return <P extends {}, R extends {}>(
    query: Query<P, R>,
    parameters: P,
  ): Promise<R> =>
    new Promise<R>((resolve: ResolveFn<R>, reject: RejectFn): void => {
      enqueue(pending, createBundle(query), parameters, resolve, reject);

      if (!timer) {
        timer = setTimeout(fire, debounce);
      }
    });
};
