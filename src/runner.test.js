/* @flow */

import test from "ava";
import { parse } from "graphql/language";
import dummee from "dummee";

import { runQueries } from "./runner";

test("simple", async t => {
  const query = parse(`query { info }`, { noLocation: true });
  const stub = dummee(() => (new Promise(resolve => resolve({ data: { info: "test" } }))));

  const data = await runQueries([{ query, variables: {} }], stub);

  t.deepEqual(data, [{ data: { info: "test" } }]);
  t.snapshot(stub.calls);
});

test("simple two", async t => {
  const query = parse(`query { info }`, { noLocation: true });
  const query2 = parse(`query { another }`, { noLocation: true });
  const stub = dummee(() => (new Promise(resolve => resolve({ data: { info: "test", another: "foo" } }))));

  const data = await runQueries([{ query, variables: {} }, { query: query2, variables: {} }], stub);

  t.deepEqual(data, [{ data: { info: "test" } }, { data: { another: "foo" } }]);
  t.snapshot(stub.calls);
});
