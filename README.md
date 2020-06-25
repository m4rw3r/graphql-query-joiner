# Rollup Plugin GraphQL AST Import

Rollup plugin enabling imports of operations as AST from .graphql files.

## Installation

```bash
npm i -S rollup-plugin-graphql-ast-import
```

## Usage

```javascript
// rollup.config.js
import { graphql } from "rollup-plugin-graphql-ast-import";

export default {
  // ...
  plugins: [
    graphql(),
  ],
};

```

```graphql
# myqueries.graphql:
query films {
  allFilms {
    title
    releaseDate
    characters {
      name
    }
  }
}

query filmsWithPerson($name: String!) {
  Person(name: $name) {
    films {
      title
      releaseDate
    }
  }
}
```

```javascript
// myfile.js
import { films, filmsWithPerson } from "./myqueries.graphql";
import { client } from "./ast-consuming-graphql-client";

const { data: { Person: { Films: filmsWithLuke } } } = await client(
  filmsWithPerson,
  { name: "Luke Skywalker" }
);

console.log("Films with Luke Skywalker: ", filmsWithLuke);

const { data: { allFilms } } = await client(films);

console.log("All films", allFilms);
```

