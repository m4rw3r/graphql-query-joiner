/* @flow */

import type { DocumentNode } from "graphql/language";

// eslint-disable-next-line no-unused-vars
export type Query<P: {}, R> = DocumentNode;

export type TypeOfQueryParameters<+Q: Query<any, any>> =
  $Call<<T, Q: Query<any, T>>(Q) => T, Q>;
