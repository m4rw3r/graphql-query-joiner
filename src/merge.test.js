/* @flow */

import test from "ava";
import { parse, print } from "graphql/language";

import { createBundle, createDocument, mergeQuery } from "./merge";

test("simple", t => {
  const query = parse(`query { info }`, { noLocation: true });

  const bundle = createBundle(query);

  t.snapshot(bundle);

  const newBundle = mergeQuery(bundle, query);

  t.snapshot(newBundle);

  const doc = createDocument(newBundle.bundle);

  t.snapshot(newBundle);

  t.snapshot(print(doc));
});

test("multiple aliased fields", t => {
  const query = parse(`query { info a: info another }`, { noLocation: true });

  const bundle = createBundle(query);

  t.snapshot(bundle);

  const newBundle = mergeQuery(bundle, query);

  t.snapshot(newBundle);

  const doc = createDocument(newBundle.bundle);

  t.snapshot(newBundle);

  t.snapshot(print(doc));
});


test("alias one, keep others", t => {
  const query = parse(`query { info }`, { noLocation: true });
  const query2 = parse(`query { info another }`, { noLocation: true });

  const bundle = createBundle(query);

  t.snapshot(bundle);

  const newBundle = mergeQuery(bundle, query2);

  t.snapshot(newBundle);

  const doc = createDocument(newBundle.bundle);

  t.snapshot(newBundle);

  t.snapshot(print(doc));
});
