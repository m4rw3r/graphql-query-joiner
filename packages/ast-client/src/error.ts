import type { GraphQLError } from "./query";

export type MissingVariableError = Error & {
  name: "MissingVariableError";
  variableName: string;
};

export type RequestError = Error & {
  name: "RequestError";
  response: Response;
  statusCode: number;
  bodyText: string;
};

export type ParseError = Error & {
  name: "ParseError";
  response: Response;
  statusCode: number;
  bodyText: string;
};

export type QueryError = Error & {
  name: "QueryError";
  errors: Array<GraphQLError>;
  queryData: Record<string, unknown>;
};

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
  errors: Array<GraphQLError>,
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
