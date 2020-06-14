/* @flow */

import test from "ava";
import { parse } from "graphql/language";
import dummee from "dummee";

import { runQueries } from "./query";

test("Empty", async t => {
  const stub = dummee(() => (new Promise(resolve => resolve({ data: { info: "test" } }))));

  const response = runQueries([], stub);

  t.true(response instanceof Promise);

  const data = await response;

  t.deepEqual(data, []);
});

test("Simple", async t => {
  const query = parse(`query { info }`, { noLocation: true });
  const stub = dummee(() => (new Promise(resolve => resolve({ data: { info: "test" } }))));

  const data = await runQueries([{ query, variables: {} }], stub);

  t.deepEqual(data, [{ data: { info: "test" } }]);
  t.snapshot(stub.calls);
});

test("Simple two", async t => {
  const query = parse(`query { info }`, { noLocation: true });
  const query2 = parse(`query { another }`, { noLocation: true });
  const stub = dummee(() => (new Promise(resolve => resolve({ data: { info: "test", another: "foo" } }))));

  const data = await runQueries([{ query, variables: {} }, { query: query2, variables: {} }], stub);

  t.deepEqual(data, [{ data: { info: "test" } }, { data: { another: "foo" } }]);
  t.snapshot(stub.calls);
});

test("Variables", async t => {
  const query = parse(
    `query ($foo: String!, $bar: Int) { info(a: $foo) second { bar(bar: $bar) } }`,
    { noLocation: true },
  );
  const query2 = parse(
    `query ($foo: String, $baz: Boolean) { info(a: $foo) another(a: $foo) third { bar(baz: $baz) } }`,
    { noLocation: true },
  );
  const stub = dummee(() => (new Promise(resolve => resolve({
    data: {
      info: "test",
      second: { bar: "wow" },
      another: "foo",
      "info_1": "test2",
      third: { bar: "lol" },
    }
  }))));

  const data = await runQueries([{ query, variables: {} }, { query: query2, variables: {} }], stub);

  t.deepEqual(data, [
    { data: { info: "test", second: { bar: "wow" } } },
    { data: { info: "test2", another: "foo", third: { bar: "lol" } } },
  ]);
  t.snapshot(stub.calls);
});
