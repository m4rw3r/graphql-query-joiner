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

export interface ExecuteOperationCallback<
  O extends TypedDocumentNode<any, any>,
> {
  /**
   * Executes the mutation with the given arguments.
   */
  (...args: OptionalParameterIfEmpty<VariablesOf<O>>): void;
  /**
   * Resets the contents of the mutation result.
   */
  reset(): void;
}

export interface FallibleResult<O extends TypedDocumentNode<any, any>> {
  data: ResultOf<O>;
  errors: GraphQLError[];
}

interface UseQueryExtra {
  refetch: () => void;
}

/**
 * @internal
 */
type InnerLazyData<T> =
  | ["pending", Promise<unknown>]
  | ["data", T]
  | ["error", unknown];

const QUERY_PREFIX = "query:";
const FALLIBLE_QUERY_PREFIX = "query!:";

export const context = createContext<Client | undefined>(undefined);
export const Provider = context.Provider;

export function useClient(): Client {
  const client = useContext(context);

  if (!client) {
    throw new Error("useClient() must be used inside a <Provider/>");
  }

  return client;
}

/**
 *
 *
 * NOTE: Query-names should be unique for each query
 */
export function useQuery<Q extends TypedDocumentNode<any, any>>(
  query: Q,
  ...args: OptionalParameterIfEmpty<VariablesOf<Q>>
): ResultOf<Q> & UseQueryExtra {
  const client = useClient();
  // TODO: How to specify the name as a parameter?
  const name = getQueryName(query);
  const id = QUERY_PREFIX + name + ":" + JSON.stringify(args[0] ?? "");

  const [value, update] = createSharedState<ResultOf<Q>>(id)(() =>
    client(query, ...args),
  );
  const refetch = useCallback(() => {
    update(client(query, ...args));
  }, [update, query, args[0]]);

  (value as UseQueryExtra).refetch = refetch;

  // By default we have any here, but should never happen in practice provided Q is typed
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return value as ResultOf<Q> & UseQueryExtra;
}

export function useFallibleQuery<Q extends TypedDocumentNode<any, any>>(
  query: Q,
  ...args: OptionalParameterIfEmpty<VariablesOf<Q>>
): FallibleResult<Q> & UseQueryExtra {
  // TODO: Refactor

  const client = useClient();
  // TODO: How to specify the name as a parameter?
  const name = getQueryName(query);
  const id = FALLIBLE_QUERY_PREFIX + name + ":" + JSON.stringify(args[0] ?? "");

  const [value, update] = createSharedState<FallibleResult<Q>>(id)(() =>
    runFallibleOperation(client, query, ...args),
  );
  const refetch = useCallback(() => {
    update(runFallibleOperation(client, query, ...args));
  }, [update, query, args[0]]);

  (value as unknown as UseQueryExtra).refetch = refetch;

  return value as FallibleResult<Q> & UseQueryExtra;
}

/**
 * Hook which manages an interactive query or mutation and its state.
 *
 * NOTE: Should never be called during the initial render of the component.
 *
 * @internal
 */
export function useLazyOperation<O extends TypedDocumentNode<any, any>>(
  mutation: O,
): [ExecuteOperationCallback<O>, FallibleResult<O> | undefined] {
  const client = useClient();
  // We can store our promise in this state since the component does not throw
  // or trigger the mutation during the initial render. This means that our
  // component state will be intact across a suspended promise.
  // TODO: Test with <React.StrictMode/>
  // TODO: Variant which throws on query errors as well?
  const [data, update] = useState<InnerLazyData<FallibleResult<O>> | undefined>(
    undefined,
  );
  const runMutation = useMemo<ExecuteOperationCallback<O>>(() => {
    const fn = (...args: OptionalParameterIfEmpty<VariablesOf<O>>) => {
      // Should only be updated on client
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (typeof process?.release?.name !== "undefined") {
        throw new Error(
          `Lazy GraphQL callbacks should only be called in a client environment`,
        );
      }

      // TODO: Replace by an Entry?
      const promise = runFallibleOperation(client, mutation, ...args).then(
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
  }, [client, mutation, update]);

  if (data && data[0] !== "data") {
    // Not data, so either promise or error
    throw data[1];
  }

  return [runMutation, data?.[1]];
}

function runFallibleOperation<O extends TypedDocumentNode<any, any>>(
  client: Client,
  operation: O,
  ...args: OptionalParameterIfEmpty<VariablesOf<O>>
): Promise<FallibleResult<O>> {
  return client(operation, ...args).then(
    (data) => ({ data, errors: [] }),
    (error) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (typeof error === "object" && error?.name === "QueryError") {
        // We trust that the Query error data actually is our data
        return {
          data: (error as QueryError).queryData as ResultOf<O>,
          errors: (error as QueryError).errors,
        };
      } else {
        throw error;
      }
    },
  );
}

function getQueryName(query: TypedDocumentNode<any, any>): string {
  if (!query.definitions[0] || !("name" in query.definitions[0])) {
    throw new Error("Query is missing name");
  }

  return query.definitions[0].name.value;
}
