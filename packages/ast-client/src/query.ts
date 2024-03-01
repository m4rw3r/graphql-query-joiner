//import type { DocumentNode } from "graphql/language";
import type {
  ResultOf,
  TypedDocumentNode,
  VariablesOf,
} from "@graphql-typed-document-node/core";

/**
 * Helper type to differentiate a Query from a Mutation.
 *
 * @deprecated
 */
export type Query<P, R> = Operation<P, R> & {
  /**
   * Phantom type (never assigned) for indicating it is a query.
   */
  readonly _O: "query";
};

/**
 * Helper type to differentiate a Mutation from a Query.
 *
 * @deprecated
 */
export type Mutation<P, R> = Operation<P, R> & {
  /**
   * Phantom type (never assigned) for indicating it is a mutation.
   */
  readonly _O: "mutation";
};

/**
 * A typed GraphQL operation with defined parameters and response.
 *
 * The `_*` properties never exist, they only carry type information,
 * also called phantom data. This type-information is used to enforce
 * operation-parameters and responses at compile-time.
 *
 * An Operation instance can only be constructed using type-assertions.
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
 *   const myQuery = someDocumentNode as Operation<MyParameters, MyResponse>;
 *
 *   runQuery(myQuery, { path: "foo" }).page.contents // OK!
 *   runQuery(myQuery, { path: ["foo"] }) // error
 *   runQuery(myQuery, { path: "foo" }).contents // error
 *
 * @see OperationParameters -- Helper to obtain the variables type
 * @see OperationResult -- Helper to obtain the result type
 *
 * @deprecated - Use TypedDocumentNode from @graphql-typed-document-node/core
 */
export type Operation<P, R> = TypedDocumentNode<R, P>;

/**
 * The parameters of an operation of type O.
 *
 * @deprecated - Use VariablesOf from @graphql-typed-document-node/core
 */
export type OperationParameters<O> = VariablesOf<O>;

/**
 * The results of an operation of type O.
 *
 * @deprecated - Use ResultOf from @graphql-typed-document-node/core
 */
export type OperationResult<O> = ResultOf<O>;

/**
 * Type describing an object which cannot have any properties ever.
 */
export type EmptyObject = Record<string | number | symbol, never>;

/**
 * Map of name in AST -> name in operation.
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
