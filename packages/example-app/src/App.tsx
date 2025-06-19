import type { RunOperation } from "@awardit/graphql-ast-client";
import type { ReactElement } from "react";

import { Suspense, useTransition, useState } from "react";
import { createClient } from "@awardit/graphql-ast-client";
import {
  Provider,
  useLazyOperation,
  useQuery,
} from "@awardit/react-graphql-hooks";

// TODO: Generate types for graphql imports
import { addDog, getDogs } from "./queries.graphql";

const client = createClient({
  runOperation: (() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            foo: "test",
          },
        });
      }, 2000);
    });
  }) as RunOperation,
  debounce: 0,
});

function Loader(): ReactElement {
  return <div>Loading...</div>;
}

function Dogs({
  startTransition,
}: {
  startTransition: (cb: () => void) => void;
}): ReactElement {
  const data = useQuery(getDogs, { type: "GOOD" });
  const [result, runMutation] = useLazyOperation(addDog);

  return (
    <div>
      <button
        onClick={() => {
          startTransition(() => {
            runMutation({ name: "" });
          });
        }}
      >
        Add Dog
      </button>
      <ol>
        <li>Dog {JSON.stringify(result)}</li>
      </ol>
      <ul>
        {data.dogs?.map((dog) => (dog ? <li>{dog.name}</li> : undefined))}
      </ul>
    </div>
  );
}

export function App(): ReactElement {
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
