import type { GraphQLError } from "./query";

export interface MissingVariableError extends Error {
  name: "MissingVariableError";
  variableName: string;
}

export interface RequestError extends Error {
  name: "RequestError";
  response: Response;
  statusCode: number;
  bodyText: string;
}

export interface ParseError extends Error {
  name: "ParseError";
  response: Response;
  statusCode: number;
  bodyText: string;
}

export interface QueryError extends Error {
  name: "QueryError";
  errors: GraphQLError[];
  queryData: Record<string, unknown>;
}

function graphqlErrorMessage({ message }: GraphQLError): string {
  return message;
}

export function requestError(
  response: Response,
  bodyText: string,
  message: unknown,
): RequestError {
  const error: RequestError = new Error(message as string) as RequestError;

  error.name = "RequestError";
  error.response = response;
  error.statusCode = response.status;
  error.bodyText = bodyText;

  return error;
}

export function parseError(
  response: Response,
  bodyText: string,
  message: unknown,
): ParseError {
  const error: ParseError = new Error(message as string) as ParseError;

  error.name = "ParseError";
  error.response = response;
  error.statusCode = response.status;
  error.bodyText = bodyText;

  return error;
}

export function queryError(
  errors: GraphQLError[],
  queryData: Record<string, unknown>,
): QueryError {
  const error: QueryError = new Error(
    errors.map(graphqlErrorMessage).join(", "),
  ) as QueryError;

  error.name = "QueryError";
  error.errors = errors;
  error.queryData = queryData;

  return error;
}

export function missingVariableError(name: string): MissingVariableError {
  const error: MissingVariableError = new Error(
    `Variable '${name}' is missing.`,
  ) as MissingVariableError;

  error.name = "MissingVariableError";
  error.variableName = name;

  return error;
}
