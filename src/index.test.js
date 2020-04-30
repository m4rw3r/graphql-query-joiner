/* @flow */

import test from "ava";
import { addQuery, createBatch, stringify } from ".";

test("Foo", t => {
  const b = createBatch("query");

  addQuery(b, `query Foo($param: String) {
    getIt(value: $param) {
      result
    }
  }`, { param: "asdf" });
  addQuery(b, `fragment Foo on Bar { test }
  query Baz($param: String) {
    bopIt(value: $param) {
      result
    }
  }`, { param: "lol" });

  t.snapshot(stringify(b));
  t.snapshot(b.variables);
  t.snapshot(b.parameters);
});
