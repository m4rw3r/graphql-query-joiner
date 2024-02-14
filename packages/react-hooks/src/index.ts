import type {
  Client,
  GraphQLError,
  Mutation,
  Operation,
  OperationParameters,
  OperationResult,
  OptionalParameterIfEmpty,
  Query,
} from "@awardit/graphql-ast-client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChamp } from "@m4rw3r/react-pause-champ";

const QUERY_PREFIX = "query:";

export const context = createContext<Client | undefined>(undefined);
export const Provider = context.Provider;

export function useClient(): Client {
  const client = useContext(context);

  if (!client) {
    throw new Error("useClient() must be used inside a <Provider/>");
  }

  return client;
}

interface UseQueryExtra {
  refetch: () => void;
}

/**
 *
 */
export function useQuery<Q extends Query<any, any>>(
  query: Q,
  ...args: OptionalParameterIfEmpty<OperationParameters<Q>>
  // , options?: UseQueryOptions = {}
): OperationResult<Q> & UseQueryExtra {
  // TODO: How to specify the name as a parameter?
  const name = getQueryName(query);
  const oldParams = useRef(args[0]);
  const client = useClient();
  // TODO: Should we warn if we use the same query more than once?
  // TODO: How can we indicate that we WANT partial responses? Ie. get the
  //       response-data, and an error property with the error into our component?
  // TODO: Maybe use some kind of shared version of useChamp, where it allows
  //       multiple consumers, but only drops once all listeners are gone?
  const [value, update] = useChamp(
    QUERY_PREFIX + name + ":" + JSON.stringify(args[0]),
    () => client(query, ...args),
  );
  (value as UseQueryExtra).refetch = useCallback(
    () => update(client(query, ...args)),
    [args[0]],
  );

  if (!shallowEquals(oldParams, args[0] || {})) {
    // Since we are suspending on this, we cannot update while being suspended.
    // TODO: We want to throw immediately here, to avoid re-render, expose
    //       PauseChamp internals through separate package?
    update(client(query, ...args));
  }

  return value;
}

export interface ExecuteOperationCallback<O extends Operation<any, any>> {
  /**
   * Executes the mutation with the given arguments.
   */
  (...args: OptionalParameterIfEmpty<OperationParameters<O>>): void;
  /**
   * Resets the contents of the mutation result.
   */
  reset(): void;
}

export interface LazyResult<O extends Operation<any, any>> {
  data: OperationResult<O>;
  errors: GraphQLError[];
}

type InnerLazyData<T> =
  | ["pending", Promise<any>]
  | ["data", T]
  | ["error", any];

export function useMutation<M extends Mutation<any, any>>(
  mutation: M,
): [ExecuteOperationCallback<M>, LazyResult<M> | undefined] {
  // TODO: Verify that it is a mutation?

  return useLazy(mutation);
}

// TODO: Is this not the same as useMutation? And should only execute in the browser?
export function useLazyQuery<Q extends Query<any, any>>(
  query: Q,
): [ExecuteOperationCallback<Q>, LazyResult<Q> | undefined] {
  // TODO: Verify that it is a query?

  return useLazy(query);
}

// Inner implementation
function useLazy<O extends Operation<any, any>>(
  mutation: O,
): [ExecuteOperationCallback<O>, LazyResult<O> | undefined] {
  const client = useClient();
  const [data, update] = useState<InnerLazyData<LazyResult<O>> | undefined>(
    undefined,
  );
  const runMutation = useMemo<ExecuteOperationCallback<O>>(() => {
    const fn = (...args: OptionalParameterIfEmpty<OperationParameters<O>>) => {
      // Should only be updated on client
      if (
        typeof process !== "undefined" &&
        typeof process.release.name !== "undefined"
      ) {
        throw new Error(
          `useMutation() callback should only be called in a client environment`,
        );
      }

      const promise = client(mutation, ...args).then(
        (result) =>
          update([
            "data",
            {
              data: result,
              errors: [],
            },
          ]),
        (error) => {
          if (error.name === "QueryError") {
            // We trust that the Query error data actually is our data
            update([
              "data",
              {
                data: error.queryData as OperationResult<O>,
                errors: error.errors as GraphQLError[],
              },
            ]);
          } else {
            // Save as error so we can throw
            update(["error", error]);
          }
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

// TODO: useSharedQuery
// TODO: Prefetching?

function getQueryName(query: Query<any, any>): string {
  if (!query.definitions[0] || !("name" in query.definitions[0])) {
    throw new Error("Query is missing name");
  }

  return query.definitions[0].name.value;
}

function shallowEquals(
  a: Record<string | number | symbol, any>,
  b: Record<string | number | symbol, any>,
): boolean {
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(
      (key) =>
        Object.prototype.hasOwnProperty.call(b, key) && a[key] === b[key],
    )
  );
}

// TODO: Reuse?
/**
 * @internal
 */
export function isThenable<T>(value: unknown): value is Promise<T> {
  return typeof (value as Promise<T> | null | undefined)?.then === "function";
}
