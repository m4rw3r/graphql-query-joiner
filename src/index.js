/* @flow */

export type {
  Query,
  QueryParameters,
  QueryResponse,
  QueryRequest,
  GraphQLError,
  GraphQLResponse,
  GraphQLClient,
} from "./query";
export type { Client } from "./client";

export { runQueries } from "./query";
export { createClient } from "./client";

