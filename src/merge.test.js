/* @flow */

import test from "ava";
import { parse, print } from "graphql/language";

import { createBundle, createDocument, mergeQueries } from "./merge";

test("simple", t => {
  const query = parse(`query { info }`, { noLocation: true });

  const bundle = createBundle(query);

  t.snapshot(bundle);

  const newBundle = mergeQueries(bundle, query);

  t.snapshot(newBundle);

  const doc = createDocument(newBundle.bundle);

  t.snapshot(newBundle);

  t.snapshot(print(doc));
});
