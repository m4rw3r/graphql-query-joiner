import type { Mutation, RunOperation } from "@awardit/graphql-ast-client";
import { Suspense, createElement, useTransition, useState } from "react";
import { createClient } from "@awardit/graphql-ast-client";
import { Provider, useLazyOperation } from "@awardit/graphql-react-hooks";
import { parse } from "graphql/language";

// TODO: Generate types for graphql imports
// import { addDogs, getDogs } from "./queries.graphql";

const client = createClient({
  runOperation: (() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            foo: "test",
          },
          errors: [{ message: "Test error", path: ["other"] }],
        });
      }, 2000);
    });
  }) as RunOperation,
  debounce: 0,
});

// TODO: Replace with graphql AST import with types
const query = parse(`mutation addDog { foo }`) as Mutation<
  void,
  { foo: string }
>;

function Loader(): JSX.Element {
  return <div>Loading...</div>;
}

function Dogs({
  startTransition,
}: {
  startTransition: (cb: () => void) => void;
}): JSX.Element {
  const [runMutation, result] = useLazyOperation(query);
  // const result = useQuery(query);

  return (
    <div>
      <button
        onClick={() => {
          startTransition(() => {
            runMutation();
          });
        }}
      >
        Add Dog
      </button>
      <ol>
        <li>Dog {JSON.stringify(result)}</li>
      </ol>
    </div>
  );
}

/*
function Dogs({ onDogSelected }): JSX.Element {
  const data = useQuery(getDogs, { typeOfDog: "good" });

  return (
    <select name="dog" onChange={onDogSelected}>
      ...
    </select>
  );
}

function FluffyDogs(): JSX.Element {
  const data = useQuery(getDogs, { typeOfDog: "fluffy" });
  const [add, { data, error }] = useMutation(addDogs);

  return (
    <div>
    <button onClick={() => add({ name: "Henrik" })}>Add</buddon>
    <ol>
    </ol>
    </div>
  );
}
*/

export function App(): JSX.Element {
  const [isTransitioning, startTransition] = useTransition();
  const [show, setShow] = useState(false);

  return (
    <div style={isTransitioning ? { opacity: 0.5 } : {}}>
      <button
        onClick={() => {
          setShow(true);
        }}
      >
        Show
      </button>
      <Provider value={client}>
        <Suspense fallback={<Loader />}>
          {show ? <Dogs startTransition={startTransition} /> : undefined}
        </Suspense>
      </Provider>
    </div>
  );
}
