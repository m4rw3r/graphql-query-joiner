export type {
  Query,
  QueryParameters,
  QueryResult,
  GraphQLError,
  GraphQLResponse,
} from "./query";
export type {
  Client,
  CreateClientOptions,
  PreparedQuery,
  QueryRunner,
} from "./client";

export { createClient, handleFetchResponse } from "./client";
