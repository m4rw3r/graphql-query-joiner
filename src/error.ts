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

const graphqlErrorMessage = ({ message }: GraphQLError): string => message;

export const requestError = (
  response: Response,
  bodyText: string,
  message: any,
): RequestError => {
  const error: RequestError = new Error(message) as any;
  error.name = "RequestError";
  error.response = response;
  error.statusCode = response.status;
  error.bodyText = bodyText;
  return error;
};

export const parseError = (
  response: Response,
  bodyText: string,
  message: any,
): ParseError => {
  const error: ParseError = new Error(message) as any;
  error.name = "ParseError";
  error.response = response;
  error.statusCode = response.status;
  error.bodyText = bodyText;
  return error;
};

export const queryError = (
  errors: Array<GraphQLError>,
  queryData: Record<string, unknown>,
): QueryError => {
  const error: QueryError = new Error(
    errors.map(graphqlErrorMessage).join(", "),
  ) as any;
  error.name = "QueryError";
  error.errors = errors;
  error.queryData = queryData;
  return error;
};

export const missingVariableError = (name: string): MissingVariableError => {
  const error: MissingVariableError = new Error(
    `Variable '${name}' is missing.`,
  ) as any;
  error.name = "MissingVariableError";
  error.variableName = name;
  return error;
};
