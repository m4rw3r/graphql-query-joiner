import type { DocumentNode } from "graphql/language";

/**
 * A typed GraphQL query with defined parameters and response.
 */
// @ts-expect-error We use unused type-parameters to indicate query parameters and response
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Query<P, R> = DocumentNode;

/**
 * The query parameters of a query of type Q.
 */
export type QueryParameters<Q> = Q extends Query<infer P, unknown> ? P : never;

/**
 * The query results of a query of type Q.
 */
export type QueryResponse<Q> = Q extends Query<unknown, infer R> ? R : never;

/**
 * Map of name in AST -> name in query.
 */
export type RenameMap = Readonly<Record<string, string>>;

export type GraphQLError = {
  message: string;
  path?: Array<string>;
};

export type GraphQLResponse<T> =
  | {
      errors?: Array<GraphQLError>;
      data: T;
    }
  | {
      errors: Array<GraphQLError>;
    };
