# GraphQL Hooks for a simple client

## Example

```typescript
import { getDogs } from "./queries.graphql";

function Dogs(): JSX.Element {
  const data = useQuery(getDogs, { type: "GOOD" });

  return (
    <ul>
      {data.dogs?.map((dog) => (dog ? <li>{dog.name}</li> : undefined))}
    </ul>
  );
}
```
