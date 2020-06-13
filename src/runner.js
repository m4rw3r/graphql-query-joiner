/* @flow */

import type { Query, QueryParameters } from "./query";

import { print } from "graphql/language";

import { createRequest } from "./request";

export type QueryRequest<Q: Query<any, any>> = {
  query: Q,
  variables: QueryParameters<Q>,
};

// TODO: Make these types easier to understand
export const runQueries = <T: $ReadOnlyArray<QueryRequest<any>>>(
  requests: T,
  client: (query: string, variables: {}) => Promise<mixed>
): Promise<$TupleMap<<R, Q: Query<any, R>>(o: { query: Q }) => T, T>> => {
  const r = requests.map(({ query }: QueryRequest<any>): Request => createRequest("_Q", query));

  const { request } = joinRequests(r);

  return new Promise((resolve, reject) => {
    resolve(client(print(requests[0].query), {}));
  });
};
