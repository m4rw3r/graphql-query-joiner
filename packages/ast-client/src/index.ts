export type {
  EmptyObject,
  GraphQLError,
  GraphQLResponse,
  Mutation,
  Operation,
  OperationParameters,
  OperationResult,
  Query,
} from "./query";
export type {
  MissingVariableError,
  ParseError,
  QueryError,
  RequestError,
} from "./error";
export type {
  Client,
  CreateClientOptions,
  OptionalParameterIfEmpty,
  PreparedOperation,
  RunOperation,
} from "./client";
// Reexports
export type {
  ResultOf,
  TypedDocumentNode,
  VariablesOf,
} from "@graphql-typed-document-node/core";

export { createClient, handleFetchResponse } from "./client";
