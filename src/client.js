/* @flow */

import type { GraphQLResponse, GraphQLError, Query, RenameMap } from "./query";
import type { QueryBundle } from "./bundle";

import { print } from "graphql/language";
import { createBundle, createDocument, mergeBundle } from "./bundle";
import { requestError, parseError, queryError } from "./error";

export type ClientArgs = {
  // TODO: Simplify or remove the Response requirement?
  runQuery: ({ query: string, variables: { [key: string]: mixed } }) => Promise<Response>,
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

const createPending = (
  bundle: QueryBundle,
  parameters: mixed,
  resolve: ResolveFn,
  reject: RejectFn
): Group => {
  // TODO: Verify variables exist?
  const variables = { ...(typeof parameters === "object" || {}) };
  const firstBundleFields = {};

  bundle.fields.forEach((_: mixed, k: string): void => {
    firstBundleFields[k] = k;
  });

  const fieldMap: Array<RenameMap> = [
    firstBundleFields,
  ];

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

export const createClient = ({ runQuery, debounce = 50 }: ClientArgs): Client<{}> => {
  let next = resolved;
  let timer;
  let pending = [];

  const runGroup = ({ bundle, variables, fieldMap, promises }: Group): Promise<void> => {
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

  const fire = (): void => {
    // TODO: Control how this chaining is done
    next = next.then((): Promise<void> => {
      // TODO: This is the chaining which should always happen, to
      // ensure ordering of the group operation types
      const r = pending.reduce(
        (p: Promise<void>, group: Group): Promise<void> =>
          p.then((): Promise<void> => runGroup(group)),
        resolved
      );

      // Clear now that we fired off stuff
      pending = [];
      timer = null;

      return r;
    });
  };

  return <P, R: {}>(
    queryAst: Query<P, R>,
    queryParameters: P,
    // eslint-disable-next-line no-unused-vars
    options?: {} = {}
  ): Promise<R> => {
    // TODO: Split into a grouped queue without any timers, and then wrap it
    // with timer logic
    const newBundle = createBundle(queryAst);

    return new Promise<any>((resolve: ResolveFn, reject: RejectFn): void => {
      if (!timer) {
        timer = setTimeout(fire, debounce);
      }

      if (pending.length > 0 &&
        pending[pending.length - 1].bundle.operation === newBundle.operation
      ) {
        const pendingGroup = pending[pending.length - 1];
        const { bundle, renamedVariables, renamedFields } =
          mergeBundle(pendingGroup.bundle, newBundle);

        pendingGroup.bundle = bundle;

        /* eslint-disable guard-for-in */
        for (const k in renamedVariables) {
          if (typeof queryParameters !== "object" || !queryParameters) {
            // FIXME: Proper error message
            throw new Error("FOOBAR");
          }

          pendingGroup.variables[renamedVariables[k]] = queryParameters[k];
        }
        /* eslint-enable guard-for-in */

        pendingGroup.fieldMap.push(renamedFields);
        pendingGroup.promises.push({ resolve, reject });
      } else {
        pending.push(createPending(newBundle, queryParameters, resolve, reject));
      }
    });
  };
};

