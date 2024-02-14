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
 *
 * @see OperationParameters -- Helper to obtain the query variables type
 * @see OperationResult -- Helper to obtain the query result type
 */
// Non-optional phantom types to make it impossible to assign a non-Query to
// Query, construction should be done through type-assertions (as keyword).
// TODO: Maybe add restrictions to the parameters?
export type Query<P, R> = Operation<P, R> & {
  /**
   * Phantom type (never assigned) for indicating it is a query.
   */
  readonly _O: "query";
};

/**
 * A typed GraphQL query with defined parameters and response.
 *
 * The `_*` properties never exist, they only carry type information,
 * also called phantom data. This type-information is used to enforce
 * query-parameters and responses at compile-time.
 *
 * Like a Query, Mutations can only be created using type-assertions.
 *
 * Example:
 *
 *   interface CreateUserVariables {
 *     user: PartialUser;
 *   }
 *
 *   interface CreateUserResponse {
 *     user: User;
 *   }
 *
 *   const myMutation = someDocumentNode as Mutation<
 *     CreateUserVariables,
 *     CreateUserResponse,
 *   >;
 *
 *   runQuery(myMutation, { user: { ... } }).user.name // OK!
 *   runQuery(myMutation, { path: ["foo"] }) // error
 *   runQuery(myMutation, { user: { ... } }).contents // error
 *
 * @see OperationParameters -- Helper to obtain the mutation variables type
 * @see OperationResult -- Helper to obtain the mutation result type
 */
export type Mutation<P, R> = Operation<P, R> & {
  /**
   * Phantom type (never assigned) for indicating it is a mutation.
   */
  readonly _O: "mutation";
};

/**
 * A type describing a GraphQL Operation, which are Queries, Mutations or
 * Subscriptions.
 *
 * If possible, use Query and Mutation instead of Operation directly.
 *
 * @see Query
 * @see Mutation
 * @see OperationParameters -- Helper to obtain the operation variables type
 * @see OperationResult -- Helper to obtain the operation variables type
 */
export type Operation<P, R> = DocumentNode & {
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
 * The parameters of an operation of type O.
 */
export type OperationParameters<O> =
  O extends Operation<infer P, any> ? P : never;

/**
 * The results of an operation of type O.
 */
export type OperationResult<O> = O extends Operation<any, infer R> ? R : never;

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
