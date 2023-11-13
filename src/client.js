/* @flow */

import { print } from "graphql/language";

import type { GraphQLResponse, GraphQLError, Query } from "./query";
import type { QueryBundle } from "./bundle";

import { createBundle, createDocument, mergeBundle } from "./bundle";
import { missingVariableError, parseError, queryError, requestError } from "./error";

export type QueryRunner = ({
  query: string,
  variables: { [key: string]: mixed },
}) => Promise<GraphQLResponse<mixed>>;

export type ClientArgs = {
  runQuery: QueryRunner,
  debounce?: number,
};

export type Client<-O> = <P, R: {}>(
  query: Query<P, R>,
  variables: P,
  options?: $ReadOnly<O>
) => Promise<R>;

type ResolveFn<T> = (value: T) => void;
type RejectFn = (error: Error) => void;

type RenameMap = {| +[key: string]: string |};

export type Group = {
  bundle: QueryBundle,
  variables: { [key: string]: mixed },
  fieldMap: Array<RenameMap>,
  promises: Array<{ resolve: ResolveFn<mixed>, reject: RejectFn }>,
};

export const resolved: Promise<void>
  = new Promise((resolve: ResolveFn<void>): void => resolve(undefined));

const setVariable = (
  variables: { [name: string]: mixed},
  parameters: mixed,
  key: string,
  newName: string
): void => {
  if (typeof parameters !== "object"
    || !parameters
    // $FlowFixMe[method-unbinding]
    || !Object.prototype.hasOwnProperty.call(parameters, key)) {
    throw missingVariableError(key);
  }

  variables[newName] = parameters[key];
};

const createGroup = <P, R>(
  bundle: QueryBundle,
  parameters: P,
  resolve: ResolveFn<R>,
  reject: RejectFn
): Group => {
  const variables = {};
  const firstBundleFields = {};
  const fieldMap: Array<RenameMap> = [
    firstBundleFields,
  ];

  bundle.variables.forEach((_: mixed, k: string): void => setVariable(variables, parameters, k, k));
  bundle.fields.forEach((_: mixed, k: string): void => {
    firstBundleFields[k] = k;
  });

  return {
    bundle,
    variables,
    fieldMap,
    promises: [{ resolve: (resolve: any), reject }],
  };
};

/**
 * Handles a fetch-Response and parses it into a GraphQLResponse,
 * throws if the request is not ok or if JSON fails to parse.
 */
export const handleFetchResponse = <R>(response: Response): Promise<R> =>
  response.text().then((bodyText: string): R => {
    if (!response.ok) {
      throw requestError(response, bodyText, `Received status code ${response.status}`);
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
  reject: RejectFn
): void => {
  const last = pending[pending.length - 1];

  if (last && last.bundle.operation === newBundle.operation) {
    const { bundle, renamedVariables, renamedFields }
      = mergeBundle(last.bundle, newBundle);

    last.bundle = bundle;

    /* eslint-disable guard-for-in */
    for (const k in renamedVariables) {
      setVariable(last.variables, parameters, k, renamedVariables[k]);
    }
    /* eslint-enable guard-for-in */

    // SAFETY: We push a rename-fields and the corresponding resolve at the
    // same time
    last.fieldMap.push(renamedFields);
    last.promises.push({ resolve: (resolve: any), reject });
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
export const groupErrors = (
  errors: Array<GraphQLError>,
  groups: Array<Array<string>>
): Array<Array<GraphQLError>> => {
  const matchedErrors = groups.map((group: Array<string>): Array<GraphQLError> =>
    errors.filter((error: GraphQLError): boolean => group.includes((error.path || [])[0])));

  // We need to make sure that errors without a path also gets propagated
  const missingErrors = errors.filter((error: GraphQLError): boolean =>
    !matchedErrors.some((g: Array<GraphQLError>): boolean => g.includes(error)));

  matchedErrors.forEach((m: Array<GraphQLError>): mixed => m.push(...missingErrors));

  return matchedErrors;
};

export const runGroup = (
  runQuery: QueryRunner,
  { bundle, variables, fieldMap, promises }: Group
): Promise<void> => runQuery({
  query: print(createDocument(bundle)),
  variables,
}).then((bundledResponse: GraphQLResponse<mixed>): void => {
  const errors = groupErrors(
    bundledResponse.errors || [],
    fieldMap.map((map: RenameMap): Array<any> => Object.values(map))
  );

  fieldMap.forEach((fields: RenameMap, i: number): void => {
    const data = {};

    if (typeof bundledResponse.data === "object" && bundledResponse.data) {
      /* eslint-disable guard-for-in */
      for (const k in fields) {
        data[k] = bundledResponse.data[fields[k]];
      }
      /* eslint-enable guard-for-in */
    }

    if (errors[i].length > 0) {
      return promises[i].reject(queryError(errors[i], data));
    }

    promises[i].resolve(data);
  });
}, (error: Error): void =>
  promises.forEach(({ reject }: { reject: RejectFn }): void => reject(error))
);

export const runGroups = (runQuery: QueryRunner, groups: Array<Group>): Promise<void> =>
  groups.reduce((p: Promise<void>, group: Group): Promise<void> =>
    p.then((): Promise<void> => runGroup(runQuery, group)), resolved);

export const createClient = ({ runQuery, debounce = 50 }: ClientArgs): Client<{}> => {
  let next = resolved;
  let timer;
  let pending = [];

  const fire = (): void => {
    // TODO: Control how this chaining is done?
    next = next.then((): Promise<void> => {
      const r = runGroups(runQuery, pending);

      // Clear now that we fired off stuff
      pending = [];
      timer = null;

      return r;
    });
  };

  return <P, R: {}>(
    query: Query<P, R>,
    parameters: P,
    // eslint-disable-next-line no-unused-vars
    options?: {} = {}
  ): Promise<R> => new Promise<R>((resolve: ResolveFn<R>, reject: RejectFn): void => {
    enqueue(pending, createBundle(query), parameters, resolve, reject);

    if (!timer) {
      timer = setTimeout(fire, debounce);
    }
  });
};

