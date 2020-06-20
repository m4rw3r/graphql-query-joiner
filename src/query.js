/* @flow */

import type { DocumentNode } from "graphql/language";

// eslint-disable-next-line no-unused-vars
export type Query<P: {}, R> = DocumentNode;

export type QueryParameters<+Q: Query<any, any>> =
  $Call<<T, Q: Query<T, any>>(Q) => T, Q>;

export type QueryResponse<+Q: Query<any, any>> =
  $Call<<T, Q: Query<any, T>>(Q) => T, Q>;

export type GraphQLError = {
  message: string,
  path: Array<string>,
};

export type GraphQLResponse<T> = {
  errors?: Array<GraphQLError>,
  data: T,
};

export type RenameMap = {| +[key: string]: string |};

