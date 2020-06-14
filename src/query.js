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

export type GraphQLClient = <Q: Query<any, any>>(query: Q, variables: QueryParameters<Q>) =>
  Promise<GraphQLResponse<QueryResponse<Q>>>;

export const runQueries = <T: $ReadOnlyArray<QueryRequest<any>>>(
  requests: T,
  client: GraphQLClient
): Promise<Array<GraphQLResponse<any>>> => {
  if (requests.length === 0) {
    return new Promise((resolve: (Array<GraphQLResponse<any>>) => void): void => resolve([]));
  }

  // Unordered
  const requestVariables = { ...requests[0].variables };
  const firstBundle = createBundle(requests[0].query);
  // Ordered
  const firstBundleFields = new Map();

  for (const i of firstBundle.fields.keys()) {
    firstBundleFields.set(i, i);
  }

  const responseFieldMap = [
    firstBundleFields,
  ];
  /* eslint-disable unicorn/no-reduce */
  const bundle = requests.slice(1).reduce((b: QueryBundle, r: QueryRequest<any>): QueryBundle => {
  /* eslint-enable unicorn/no-reduce */
    const { bundle, renamedVariables, renamedFields } = mergeQuery(b, r.query);

    for (const [k, v] of renamedVariables) {
      requestVariables[v] = r.variables[k];
    }

    responseFieldMap.push(renamedFields);

    return bundle;
  }, firstBundle);

  const response = client(createDocument(bundle), requestVariables);

  return response.then((bundledResponse: GraphQLResponse<any>): Array<GraphQLResponse<any>> => {
    // TODO: Handle errors

    return responseFieldMap.map((fields: $ReadOnlyMap<string, string>): GraphQLResponse<any> => {
      const data = {};

      for (const [k, v] of fields) {
        data[k] = bundledResponse.data[v];
      }

      return {
        data,
      };
    });
  });
};
