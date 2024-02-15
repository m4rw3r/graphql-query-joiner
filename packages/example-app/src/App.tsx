import type { Mutation } from "@awardit/graphql-ast-client";
import { Suspense, createElement } from "react";
import { createClient } from "@awardit/graphql-ast-client";
import { Provider, useMutation } from "@awardit/graphql-react-hooks";
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
  }) as any,
  debounce: 0,
});

// TODO: Replace with graphql AST import with types
const query = parse(`query addDog { foo }`) as Mutation<void, { foo: string }>;

function Loader(): JSX.Element {
  return <div>Loading...</div>;
}

function Dogs(): JSX.Element {
  console.log("Rendering Dogs");

  const [runMutation, result] = useMutation(query);

  console.log("Actual Rendering");

  return (
    <div>
      <button
        onClick={() => {
          console.log("On Click");
          runMutation();
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
  console.log("App");
  return (
    <Provider value={client}>
      <Suspense fallback={<Loader />}>
        <Dogs />
      </Suspense>
    </Provider>
  );
}
