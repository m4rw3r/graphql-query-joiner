/* @flow */

import type { DocumentNode } from "graphql/language";
import type { Query, QueryParameters } from "./query";
import type { QueryBundle } from "./merge";

import { createBundle, createDocument, mergeQuery } from "./merge";

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

// TODO: Make these types easier to understand
export const runQueries = <T: $ReadOnlyArray<QueryRequest<any>>>(
  requests: T,
  client: (query: DocumentNode, variables: {}) => Promise<GraphQLResponse<any>>
): Promise<Array<GraphQLResponse<any>>> => {
  if (requests.length === 0) {
    return new Promise((resolve: (Array<GraphQLResponse<any>>) => void): void => resolve([]));
  }

  // Unordered
  const requestVariables = { ...requests[0].variables };
  const firstBundle = createBundle(requests[0].query);
  const firstBundleFields = new Map();

  for (const i of firstBundle.fields.keys()) {
    firstBundleFields.set(i, i);
  }

  const responseFieldMap = [
    firstBundleFields,
  ];
  const bundle = requests.slice(1).reduce((b: QueryBundle, r: QueryRequest<any>): QueryBundle => {
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
        data[v] = bundledResponse.data[k];
      }

      return {
        data,
      };
    });
  });
};
