/* @flow */

import type { DocumentNode } from "graphql/language";

// eslint-disable-next-line no-unused-vars
export type Query<P, R> = DocumentNode;

export type QueryParameters<+Q: Query<mixed, mixed>> =
  $Call<<T, Q: Query<T, mixed>>(Q) => T, Q>;

export type QueryResponse<+Q: Query<mixed, mixed>> =
  $Call<<T, Q: Query<mixed, T>>(Q) => T, Q>;

export type GraphQLError = {
  message: string,
  path: Array<string>,
};

export type GraphQLResponse<T> = {
  errors?: Array<GraphQLError>,
  data: T,
} | {
  errors: Array<GraphQLError>,
};

