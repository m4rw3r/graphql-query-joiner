/* @flow */

import type { GraphQLResponse, GraphQLError, Query, RenameMap } from "./query";
import type { QueryBundle } from "./bundle";

import { print } from "graphql/language";
import { createBundle, createDocument, mergeBundle } from "./bundle";
import { missingVariableError, parseError, queryError, requestError } from "./error";

// TODO: Simplify or remove the Response requirement?
export type QueryRunner = ({
  query: string,
  variables: { [key: string]: mixed },
}) => Promise<Response>;

export type ClientArgs = {
  runQuery: QueryRunner,
  debounce?: number,
};

export type Client<-O> = <P, R: {}>(
  query: Query<P, R>,
  variables: P,
  options?: $ReadOnly<O>
) => Promise<R>;

type ResolveFn = (value: any) => void;
type RejectFn = (error: Error) => void;

type Group = {
  bundle: QueryBundle,
  variables: { [key: string]: mixed },
  fieldMap: Array<RenameMap>,
  promises: Array<{ resolve: ResolveFn, reject: RejectFn }>,
};

export const resolved: Promise<void> =
  new Promise((resolve: ResolveFn): void => resolve(undefined));

const setVariable = (
  variables: { [name: string]: mixed},
  parameters: mixed,
  key: string,
  newName: string
): void => {
  if (typeof parameters !== "object" ||
    !parameters ||
    !Object.prototype.hasOwnProperty.call(parameters, key)) {
    throw missingVariableError(key);
  }

  variables[newName] = parameters[key];
};

const createGroup = (
  bundle: QueryBundle,
  parameters: mixed,
  resolve: ResolveFn,
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
    promises: [{ resolve, reject }],
  };
};

export const handleResponse = <R>(response: Response): Promise<R> =>
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

export const enqueue = (
  pending: Array<Group>,
  newBundle: QueryBundle,
  parameters: mixed,
  resolve: ResolveFn,
  reject: RejectFn
): void => {
  const last = pending[pending.length - 1];

  if (last && last.bundle.operation === newBundle.operation) {
    const { bundle, renamedVariables, renamedFields } =
      mergeBundle(last.bundle, newBundle);

    last.bundle = bundle;

    /* eslint-disable guard-for-in */
    for (const k in renamedVariables) {
      setVariable(last.variables, parameters, k, renamedVariables[k]);
    }
    /* eslint-enable guard-for-in */

    last.fieldMap.push(renamedFields);
    last.promises.push({ resolve, reject });
  } else {
    pending.push(createGroup(newBundle, parameters, resolve, reject));
  }
};

export const runGroup = (
  runQuery: QueryRunner,
  { bundle, variables, fieldMap, promises }: Group
): Promise<void> => {
  return runQuery({
    query: print(createDocument(bundle)),
    variables,
  }).then(handleResponse)
    .then((bundledResponse: GraphQLResponse<any>): void => {
      const errors = fieldMap.map((): Array<GraphQLError> => []);

      // TODO: Can we simplify this error matching?
      (bundledResponse.errors || []).forEach((error: GraphQLError): void => {
        let found = false;

        /* eslint-disable unicorn/no-for-loop */
        for (let i = 0; i < fieldMap.length; i++) {
          const map = fieldMap[i];

          for (const k in map) {
            if (error.path[0] === map[k]) {
              found = true;

              errors[i].push(error);
            }
          }
        }
        /* eslint-enable unicorn/no-for-loop */

        if (!found) {
          errors.forEach((item: Array<GraphQLError>): void => {
            item.push(error);
          });
        }
      });

      fieldMap.forEach((fields: RenameMap, i: number): void => {
        if (errors[i].length > 0) {
          return promises[i].reject(queryError(errors[i]));
        }

        const data = {};

        /* eslint-disable guard-for-in */
        for (const k in fields) {
          data[k] = bundledResponse.data[fields[k]];
        }
        /* eslint-enable guard-for-in */

        promises[i].resolve(data);
      });
    }, (error: Error): void =>
      promises.forEach(({ reject }: { reject: RejectFn }): void => reject(error))
    );
};

export const createClient = ({ runQuery, debounce = 50 }: ClientArgs): Client<{}> => {
  let next = resolved;
  let timer;
  let pending = [];

  const fire = (): void => {
    // TODO: Control how this chaining is done
    next = next.then((): Promise<void> => {
      // TODO: This is the chaining which should always happen, to
      // ensure ordering of the group operation types
      const r = pending.reduce(
        (p: Promise<void>, group: Group): Promise<void> =>
          p.then((): Promise<void> => runGroup(runQuery, group)),
        resolved
      );

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
  ): Promise<R> => {
    return new Promise<any>((resolve: ResolveFn, reject: RejectFn): void => {
      enqueue(pending, createBundle(query), parameters, resolve, reject);

      if (!timer) {
        timer = setTimeout(fire, debounce);
      }
    });
  };
};

