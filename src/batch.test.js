/* @flow */

import test from "ava";
import { parse } from "graphql";
import { addQuery, createBatch, stringify } from "./batch";

test("addQuery missing param", t => {
  const b = createBatch("query");
  const doc = parse(`
    query ($param: String!) {
      field
    }
  `, { noLocation: true });

  t.throws(() => addQuery(b, doc, { }));
});

test("addQuery extra param", t => {
  const b = createBatch("query");
  const doc = parse(`
    query ($param: String!) {
      field
    }
  `, { noLocation: true });

  t.throws(() => addQuery(b, doc, { other: "param" }));
});

test("addQuery", t => {
  const b = createBatch("query");
  const doc = parse(`
    fragment Foo on Bar {
      getIt(theparam: $param) {
        data
      }
    }

    query ($param: String!) {
      here {
        ...Foo
      }
    }
  `, { noLocation: true });

  addQuery(b, doc, { param: "test" });

  t.snapshot(stringify(b));
  t.snapshot(b);
});

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
  t.snapshot(b);
});
