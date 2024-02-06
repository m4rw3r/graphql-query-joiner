import type { DocumentNode } from "graphql/language";

/**
 * A typed GraphQL query with defined parameters and response.
 */
// NOTE: We use expect error here to allow unused type-parameters
// @ts-expect-error
export type Query<P, R> = DocumentNode;

/**
 * The query parameters of a query of type Q.
 */
export type QueryParameters<Q> = Q extends Query<infer P, any> ? P : never;

/**
 * The query results of a query of type Q.
 */
export type QueryResponse<Q> = Q extends Query<any, infer R> ? R : never;

type NonEmptyArray<T> = [T, ...T[]];

export type GraphQLError = {
  message: string;
  path?: NonEmptyArray<string>;
};

export type GraphQLResponse<T> =
  | {
      errors?: NonEmptyArray<GraphQLError>;
      data: T;
    }
  | {
      errors: NonEmptyArray<GraphQLError>;
    };
