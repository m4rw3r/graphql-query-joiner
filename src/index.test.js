/* @flow */

import test from "ava";
import { parse } from "graphql";
import { addQuery, createBatch, stringify } from ".";

test("Foo", t => {
  const b = createBatch("query");

  addQuery(b, parse(`query Foo($param: String) {
    getIt(value: $param) {
      result
    }
  }`, { noLocation: true }), { param: "asdf" });
  addQuery(b, parse(`fragment Foo on Bar { test }
  query Baz($param: String) {
    bopIt(value: $param) {
      result
    }
  }`, { noLocation: true }), { param: "lol" });

  t.snapshot(stringify(b));
  t.snapshot(b.variables);
  t.snapshot(b.parameters);
});
