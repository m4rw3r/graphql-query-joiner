export type {
  EmptyObject,
  GraphQLError,
  GraphQLResponse,
  Query,
  QueryParameters,
  QueryResult,
} from "./query";
export type {
  Client,
  CreateClientOptions,
  OptionalParameterIfEmpty,
  PreparedQuery,
  QueryRunner,
} from "./client";

export { createClient, handleFetchResponse } from "./client";
