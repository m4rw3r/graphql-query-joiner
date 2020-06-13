/* @flow */

import test from "ava";
import { parse } from "graphql/language";
import dummee from "dummee";

import { runQueries } from "./runner";

test("simple", async t => {
  const query = parse(`query { info }`, { noLocation: true });
  const stub = dummee(() => ({ data: { info: "test" } }));

  const data = await runQueries([{ query, variables: {} }], stub);

  t.deepEqual(data, [{ data: { info: "test" } }]);
  t.deepEqual(stub.calls, [{ args: ["query { info }"] }]);
});
