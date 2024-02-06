## Features

- All GraphQL Queries are run in `GET` requests.
- All GraphQL Mutations are run in `POST` requests.
- Multiple simultaneous GraphQL Queries are grouped in the same request.
- Multiple simultaneous GraphQL Mutations are grouped in the same request, preserving order.

## Example

```javascript
import { parse } from "graphql";
import { createClient, handleFetchResponse } from "@awardit/graphql-client";

// Or use gql template strings or any other tool to compile these into AST
const myQuery = parse(`query {
  test
}`);
const infoQuery = parse(`query {
  info
}`);

const client = createClient({
  runQuery: ({ query, variables }) =>
    fetch("/graphql", {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    }).then(handleFetchResponse),
  debounce: 5,
});

// Single request
const { test } = await client(myQuery);

console.log(test);

// Two merged in the same query
const [{ test }, { info }] = await Promise.all([
  client(myQuery),
  client(infoQuery),
]);

console.log(test);
console.log(info);
```
