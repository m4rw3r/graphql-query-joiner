/* @flow */

import type { DocumentNode } from "graphql/language";
import type { QueryBundle } from "./bundle";

import { createBundle, createDocument, mergeQuery } from "./bundle";

// eslint-disable-next-line no-unused-vars
export type Query<P: {}, R> = DocumentNode;

export type QueryParameters<+Q: Query<any, any>> =
  $Call<<T, Q: Query<T, any>>(Q) => T, Q>;

export type QueryResponse<+Q: Query<any, any>> =
  $Call<<T, Q: Query<any, T>>(Q) => T, Q>;

export type QueryRequest<Q: Query<any, any>> = {
  query: Q,
  variables: QueryParameters<Q>,
};

export type GraphQLError = {
  message: string,
};

export type GraphQLResponse<T> = {
  error?: Array<GraphQLError>,
  data: T,
};

export type GraphQLClient = (query: DocumentNode, variables: { [key: string]: mixed }) =>
  Promise<GraphQLResponse<mixed>>;

type RenameMap = { +[key: string]: string };

export const runQueries = <T: $ReadOnlyArray<QueryRequest<any>>>(
  requests: T,
  client: GraphQLClient
): Promise<Array<GraphQLResponse<any>>> => {
  if (requests.length === 0) {
    return new Promise((resolve: (Array<GraphQLResponse<any>>) => void): void => resolve([]));
  }

  const requestVariables = { ...requests[0].variables };
  const firstBundle = createBundle(requests[0].query);
  const firstBundleFields = {};

  firstBundle.fields.forEach((_: mixed, k: string): void => {
    firstBundleFields[k] = k;
  });

  const responseFieldMap: Array<RenameMap> = [
    firstBundleFields,
  ];
  /* eslint-disable unicorn/no-reduce */
  const bundle = requests.slice(1).reduce((b: QueryBundle, r: QueryRequest<any>): QueryBundle => {
    const { bundle, renamedVariables, renamedFields } = mergeQuery(b, r.query);

    /* eslint-disable guard-for-in */
    for (const k in renamedVariables) {
      requestVariables[renamedVariables[k]] = r.variables[k];
    }
    /* eslint-enable guard-for-in */

    responseFieldMap.push(renamedFields);

    return bundle;
  }, firstBundle);
  /* eslint-enable unicorn/no-reduce */

  const response = client(createDocument(bundle), requestVariables);

  return response.then((bundledResponse: GraphQLResponse<any>): Array<GraphQLResponse<any>> => {
    // TODO: Handle errors

    return responseFieldMap.map((fields: RenameMap): GraphQLResponse<any> => {
      const data = {};

      /* eslint-disable guard-for-in */
      for (const k in fields) {
        data[k] = bundledResponse.data[fields[k]];
      }
      /* eslint-enable guard-for-in */

      return {
        data,
      };
    });
  });
};
