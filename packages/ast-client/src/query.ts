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
export type QueryResult<Q> = Q extends Query<unknown, infer R> ? R : never;

/**
 * Type describing an object which cannot have any properties ever.
 */
export type EmptyObject = Record<string | number | symbol, never>;

/**
 * Map of name in AST -> name in query.
 *
 * @internal
 */
export type RenameMap = Readonly<Record<string, string>>;

/**
 * A basic GraphQL error received from the server.
 */
export interface GraphQLError {
  message: string;
  path?: string[];
}

/**
 * A basic GraphQL response.
 */
export type GraphQLResponse<T> =
  | {
      errors?: GraphQLError[];
      data: T;
    }
  | {
      errors: GraphQLError[];
    };
