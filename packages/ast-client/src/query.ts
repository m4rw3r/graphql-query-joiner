import type { DocumentNode } from "graphql/language";

/**
 * A typed GraphQL query with defined parameters and response.
 *
 * The `_*` properties never exist, they only carry type information,
 * also called phantom data. This type-information is used to enforce
 * query-parameters and responses at compile-time.
 *
 * A Query instance can only be constructed using type-assertions.
 *
 * Example:
 *
 *   interface MyParamerters {
 *     path: string;
 *   }
 *
 *   interface MyResponse {
 *     page: {
 *       contents: string;
 *     }
 *   }
 *
 *   const myQuery = someDocumentNode as Query<MyParameters, MyResponse>;
 *
 *   runQuery(myQuery, { path: "foo" }).page.contents // OK!
 *   runQuery(myQuery, { path: ["foo"] }) // error
 *   runQuery(myQuery, { path: "foo" }).contents // error
 */
// Non-optional phantom types to make it impossible to assign a non-Query to
// Query, construction should be done through type-assertions (as keyword).
export type Query<P, R> = DocumentNode & {
  /**
   * Phantom type (never assigned) for the Query variables parameter.
   */
  readonly _P: P;
  /**
   * Phantom type (never assigned) for the Query return value.
   */
  readonly _R: R;
};

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
