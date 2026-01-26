import type { GraphQLError } from "./query";

const TRACING_HEADERS = [
  "traceparent",
  "x-request-id",
  "x-correlation-id",
  "x-amzn-trace-id",
  "x-datadog-trace-id",
  "x-b3-traceid",
  "x-b3-spanid",
  "x-ot-span-context",
] as const;

type TracingHeader = (typeof TRACING_HEADERS)[number];

interface TraceHeaderInfo {
  name: TracingHeader;
  value: string;
}

export interface MissingVariableError extends Error {
  name: "MissingVariableError";
  variableName: string;
}

export interface RequestError extends Error {
  name: "RequestError";
  statusCode: number;
  requestUrl?: string;
  contentType: string | null;
  bodyLength: number;
  traceHeader?: TraceHeaderInfo;
}

export interface ParseError extends Error {
  name: "ParseError";
  statusCode: number;
  requestUrl?: string;
  contentType: string | null;
  bodyLength: number;
  traceHeader?: TraceHeaderInfo;
}

export interface QueryError extends Error {
  name: "QueryError";
  errors: GraphQLError[];
  queryData: Record<string, unknown>;
}

function createResponseError(
  name: "RequestError",
  response: Response,
  bodyText: string,
  message: (details: string) => string,
): RequestError;
function createResponseError(
  name: "ParseError",
  response: Response,
  bodyText: string,
  message: (details: string) => string,
): ParseError;
function createResponseError(
  name: "RequestError" | "ParseError",
  response: Response,
  bodyText: string,
  message: (details: string) => string,
): RequestError | ParseError {
  let requestUrl: string | undefined;

  if (response.url) {
    try {
      const parsed = new URL(response.url);

      requestUrl = `${parsed.origin}${parsed.pathname}`;
    } catch {
      // Empty on purpose
    }
  }

  const contentType = response.headers.get("content-type");
  const traceHeader = TRACING_HEADERS.map((name) => {
    const value = response.headers.get(name);

    return value ? { name, value } : undefined;
  }).find(Boolean);
  const details = [
    requestUrl && `url=${requestUrl}`,
    `status=${response.status}`,
    `contentType=${contentType ?? "none"}`,
    `bodyLength=${bodyText.length}`,
    traceHeader && `${traceHeader.name}=${traceHeader.value}`,
  ]
    .filter(Boolean)
    .join(", ");

  return Object.assign(new Error(message(details)), {
    name,
    statusCode: response.status,
    requestUrl,
    contentType,
    traceHeader,
    bodyLength: bodyText.length,
  }) as RequestError | ParseError;
}

export function requestError(
  response: Response,
  bodyText: string,
  message: string,
): RequestError {
  return createResponseError(
    "RequestError",
    response,
    bodyText,
    (details) => `${message} (${details})`,
  );
}

export function parseError(
  response: Response,
  bodyText: string,
  cause: unknown,
): ParseError {
  const error = createResponseError(
    "ParseError",
    response,
    bodyText,
    (details) =>
      `Failed to parse JSON response (${details}, cause=${String(cause)})`,
  );
  (error as Error & { cause?: unknown }).cause = cause;

  return error;
}

export function queryError(
  errors: GraphQLError[],
  queryData: Record<string, unknown>,
): QueryError {
  const firstError = errors[0];
  const firstMessage = firstError?.message.trim() ?? "";
  const details = [
    `errorCount=${errors.length}`,
    firstMessage && `first="${firstMessage}"`,
    firstError?.path?.length ? `path=${firstError.path.join(".")}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");

  return Object.assign(new Error(`GraphQL errors (${details})`), {
    name: "QueryError",
    errors,
    queryData,
  }) as QueryError;
}

export function missingVariableError(name: string): MissingVariableError {
  const error: MissingVariableError = new Error(
    `Variable '${name}' is missing.`,
  ) as MissingVariableError;

  error.name = "MissingVariableError";
  error.variableName = name;

  return error;
}
