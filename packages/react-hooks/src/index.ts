import type {
  Client,
  GraphQLError,
  OptionalParameterIfEmpty,
  QueryError,
  ResultOf,
  TypedDocumentNode,
  VariablesOf,
} from "@awardit/graphql-ast-client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { createSharedState } from "@m4rw3r/react-pause-champ";

/**
 * Callback which executes a lazy operation.
 *
 * @public
 * @typeParam O - Typed GraphQL operation
 */
export interface ExecuteOperationCallback<
  O extends TypedDocumentNode<any, any>,
> {
  /**
   * Executes the operation with the given arguments, will suspend the
   * component during the request.
   */
  (...args: OptionalParameterIfEmpty<VariablesOf<O>>): void;
  /**
   * Resets the contents of the operation result, triggers re-render.
   */
  reset(): void;
}

/**
 * A result which can have partially failed, with erroring fields being
 * replaced by nulls.
 *
 * @public
 * @typeParam T - Query result type
 */
export interface FallibleResult<T> {
  /**
   * Query result, nullable fields can possibly be null due to query errors
   * present in the errors property.
   */
  data: T;
  /**
   * List of query errors which occurred during the query.
   */
  errors: GraphQLError[];
}

/**
 * Extra properties on a query result.
 *
 * @public
 */
interface UseQueryExtra {
  /**
   * Refetches the query, suspends the component during the request.
   */
  refetch: () => void;
}

/**
 * @internal
 */
type InnerLazyData<T> =
  | ["pending", Promise<unknown>]
  | ["data", T]
  | ["error", unknown];

/**
 * @internal
 */
const QUERY_PREFIX = "query:";
/**
 * @internal
 */
const FALLIBLE_QUERY_PREFIX = "query!:";

/**
 * @internal
 */
export const context = createContext<Client | undefined>(undefined);
/**
 * Provider for the GraphQL Client.
 *
 * @public
 */
export const Provider = context.Provider;

/**
 * Hook which returns the current graphql-client.
 *
 * @throws Error
 * This exception is thrown if no client was provided by a <Provider/> component.
 *
 * @public
 * @see {@link Provider}
 */
export function useClient(): Client {
  const client = useContext(context);

  if (!client) {
    throw new Error("useClient() must be used inside a <Provider/>");
  }

  return client;
}

/**
 * Hook which fetches a result of a GraphQL Query and suspends the rendering
 * during the request, errors will be thrown to the closest ErrorBoundary.
 *
 * NOTE: Operation-names should be unique for each query.
 *
 * Works with server-rendering using @m4rw3r/react-pause-champ.
 *
 * @public
 * @typeParam Q - Typed GraphQL query
 * @see {@link @m4rw3r/react-pause-champ:useChamp}
 * @see {@link @m4rw3r/react-pause-champ:Provider}
 * @see {@link @m4rw3r/react-pause-champ:Resume}
 * @see {@link https://react.dev/reference/react/Suspense}
 */
export function useQuery<Q extends TypedDocumentNode<any, any>>(
  query: Q,
  ...args: OptionalParameterIfEmpty<VariablesOf<Q>>
): ResultOf<Q> & UseQueryExtra {
  const client = useClient();
  // TODO: How to specify the name as a parameter?
  const id =
    QUERY_PREFIX + getQueryName(query) + ":" + JSON.stringify(args[0] ?? "");

  const [value, update] = createSharedState<ResultOf<Q>>(id)(() =>
    client(query, ...args),
  );
  const refetch = useCallback(() => {
    update(client(query, ...args));
  }, [update, query, args[0]]);

  // SAFETY: Value is always an object in a successful GraphQL response
  (value as UseQueryExtra).refetch = refetch;

  // SAFETY: By default we have any here from TypedDocumentNode<any, _>, but
  // should never happen in practice provided Q is fully typed
  //
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return value as ResultOf<Q> & UseQueryExtra;
}

/**
 * Hook which fetches the result, or partial result and query-errors, of a
 * GraphQL Query and suspends the rendering during the request.
 *
 * NOTE: Operation-names should be unique for each query.
 *
 * Works with server-rendering using @m4rw3r/react-pause-champ.
 *
 * @public
 * @typeParam Q - Typed GraphQL query
 * @see {@link useQuery}
 */
export function useFallibleQuery<Q extends TypedDocumentNode<any, any>>(
  query: Q,
  ...args: OptionalParameterIfEmpty<VariablesOf<Q>>
): FallibleResult<ResultOf<Q>> & UseQueryExtra {
  // TODO: Refactor

  const client = useClient();
  // TODO: How to specify the name as a parameter?
  const id =
    FALLIBLE_QUERY_PREFIX +
    getQueryName(query) +
    ":" +
    JSON.stringify(args[0] ?? "");

  const [value, update] = createSharedState<FallibleResult<ResultOf<Q>>>(id)(
    () => makeFallible(client(query, ...args)),
  );
  const refetch = useCallback(() => {
    update(makeFallible(client(query, ...args)));
  }, [update, query, args[0]]);

  (value as unknown as UseQueryExtra).refetch = refetch;

  return value as FallibleResult<ResultOf<Q>> & UseQueryExtra;
}

/**
 * Hook which manages an interactive query or mutation and its state.
 *
 * Initially the value will be undefined until the returned callback is called,
 * then the component will suspend during the operation until the operation has
 * completed.
 *
 * NOTE: Should never be called during the render of the component.
 *
 * @public
 * @typeParam O - Typed GraphQL operation
 */
export function useLazyOperation<O extends TypedDocumentNode<any, any>>(
  operation: O,
): [FallibleResult<ResultOf<O>> | undefined, ExecuteOperationCallback<O>] {
  const client = useClient();
  // We can store our promise in this state since the component does not throw
  // or trigger the operation during the initial render. This means that our
  // component state will be intact across a suspended promise.
  // TODO: Test with <React.StrictMode/>
  // TODO: Variant which throws on query errors as well?
  const [data, update] = useState<
    InnerLazyData<FallibleResult<ResultOf<O>>> | undefined
  >(undefined);
  const runOperation = useMemo<ExecuteOperationCallback<O>>(() => {
    const fn = (...args: OptionalParameterIfEmpty<VariablesOf<O>>) => {
      // Should only be updated on client
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (typeof process?.release?.name !== "undefined") {
        throw new Error(
          `Lazy GraphQL callbacks should only be called in a client environment`,
        );
      }

      // TODO: Replace by an Entry?
      const promise = makeFallible(client(operation, ...args)).then(
        (result) => {
          update(["data", result]);
        },
        (error) => {
          update(["error", error]);
        },
      );

      // just suspend
      update(["pending", promise]);
    };

    fn.reset = function reset(): void {
      update(undefined);
    };

    return fn;
  }, [client, operation, update]);

  if (data && data[0] !== "data") {
    // Not data, so either promise or error
    throw data[1];
  }

  return [data?.[1], runOperation];
}

/**
 * @internal
 */
function makeFallible<T>(promise: Promise<T>): Promise<FallibleResult<T>> {
  return promise.then(
    (data) => ({ data, errors: [] }),
    (error) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (typeof error === "object" && error?.name === "QueryError") {
        // SAFETY: We trust that the Query error data actually is our data
        return {
          data: (error as QueryError).queryData as T,
          errors: (error as QueryError).errors,
        };
      } else {
        throw error;
      }
    },
  );
}

/**
 * @internal
 */
function getQueryName(query: TypedDocumentNode<any, any>): string {
  if (!query.definitions[0] || !("name" in query.definitions[0])) {
    throw new Error("Query is missing name");
  }

  return query.definitions[0].name.value;
}
