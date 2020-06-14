/* @flow */

import test from "ava";
import { parse, print } from "graphql/language";

import { createBundle, createDocument, mergeQuery } from "./bundle";

test("Fragment in root", t => {
  const query = parse(`fragment Foo on Bar { test } query { ...Foo }`, { noLocation: true });

  t.throws(() => createBundle(query), {
    message: `Non-field selection found in root operation in query 'fragment Foo on Bar {
  test
}

{
  ...Foo
}
'.`,
  });
});

test("Multiple queries in root", t => {
  const query = parse(`query { foo } { bar }`, { noLocation: true });

  t.throws(() => createBundle(query), {
    message: `Query cannot contain more than one executable operation in query '{
  foo
}

{
  bar
}
'.`,
  });
});

test("No executable operation found", t => {
  const query = parse(`fragment Foo on Bar { test }`, { noLocation: true });

  t.throws(() => createBundle(query), {
    message: `Executable operation is missing in query 'fragment Foo on Bar {
  test
}
'.`,
  });
});

test("Non-executable operation found", t => {
  const query = parse(`type Foo { bar: String }`, { noLocation: true });

  t.throws(() => createBundle(query), {
    message: `Non-executable definition found in query 'type Foo {
  bar: String
}
'.`,
  });
});

test("Simple", t => {
  const query = parse(`query { info }`, { noLocation: true });
  const bundle = createBundle(query);

  t.snapshot(bundle);

  const newBundle = mergeQuery(bundle, query);

  t.snapshot(newBundle);

  const doc = createDocument(newBundle.bundle);

  t.snapshot(doc);
  t.snapshot(print(doc));
});

test("Multiple aliased fields", t => {
  const query = parse(`query { info a: info another }`, { noLocation: true });
  const bundle = createBundle(query);

  t.snapshot(bundle);

  const newBundle = mergeQuery(bundle, query);

  t.snapshot(newBundle);

  const doc = createDocument(newBundle.bundle);

  t.snapshot(doc);
  t.snapshot(print(doc));
});


test("Alias one, keep others", t => {
  const query = parse(`query { info }`, { noLocation: true });
  const query2 = parse(`query { info another }`, { noLocation: true });
  const bundle = createBundle(query);

  t.snapshot(bundle);

  const newBundle = mergeQuery(bundle, query2);

  t.snapshot(newBundle);

  const doc = createDocument(newBundle.bundle);

  t.snapshot(doc);
  t.snapshot(print(doc));
});

test("Advanced createBundle", t => {
  const query = parse(`
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
  const b = createBundle(query);

  t.snapshot(b);

  const doc = createDocument(b);

  t.snapshot(doc);
  t.snapshot(print(doc));
});

test("Advanced mergeQuery", t => {
  const b = createBundle(parse(`query Foo($param: String) {
    getIt(value: $param) {
      result
    }
  }`, { noLocation: true }));

  t.snapshot(b);

  const b2 = mergeQuery(b, parse(`fragment Foo on Bar { test }
  query Baz($param: String) {
    bopIt(value: $param) {
      result
      ...Foo
    }
  }`, { noLocation: true }));

  t.snapshot(b2);

  const doc = createDocument(b2.bundle);

  t.snapshot(doc);
  t.snapshot(print(doc));
});
