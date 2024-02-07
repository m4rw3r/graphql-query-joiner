import { parse, print } from "graphql/language";
import { createBundle, createDocument, mergeQuery } from "./bundle";

test("Fragment in root", () => {
  const query = parse(`fragment Foo on Bar { test } query { ...Foo }`, {
    noLocation: true,
  });

  expect(() => createBundle(query)).toThrow(
    `Non-field selection found in root operation in query 'fragment Foo on Bar {
  test
}

{
  ...Foo
}'.`,
  );
});

test("Multiple queries in root", () => {
  const query = parse(`query { foo } { bar }`, {
    noLocation: true,
  });

  expect(() => createBundle(query)).toThrow(
    `Query cannot contain more than one executable operation in query '{
  foo
}

{
  bar
}'.`,
  );
});

test("No executable operation found", () => {
  const query = parse(`fragment Foo on Bar { test }`, { noLocation: true });

  expect(() => createBundle(query)).toThrow(
    `Executable operation is missing in query 'fragment Foo on Bar {
  test
}'.`,
  );
});

test("Non-executable operation found", () => {
  const query = parse(`type Foo { bar: String }`, { noLocation: true });

  expect(() => createBundle(query)).toThrow(
    `Non-executable definition found in query 'type Foo {
  bar: String
}'.`,
  );
});

test("Simple", () => {
  const query = parse(`query { info }`, { noLocation: true });
  const bundle = createBundle(query);

  expect(bundle).toMatchSnapshot();

  const newBundle = mergeQuery(bundle, query);

  expect(newBundle).toMatchSnapshot();

  const doc = createDocument(newBundle.bundle);

  expect(doc).toMatchSnapshot();
  expect(print(doc)).toMatchSnapshot();
});

test("Multiple aliased fields", () => {
  const query = parse(`query { info a: info another }`, { noLocation: true });
  const bundle = createBundle(query);

  expect(bundle).toMatchSnapshot();

  const newBundle = mergeQuery(bundle, query);

  expect(newBundle).toMatchSnapshot();

  const doc = createDocument(newBundle.bundle);

  expect(doc).toMatchSnapshot();
  expect(print(doc)).toMatchSnapshot();
});

test("Alias one, keep others", () => {
  const query = parse(`query { info }`, { noLocation: true });
  const query2 = parse(`query { info another }`, { noLocation: true });
  const bundle = createBundle(query);

  expect(bundle).toMatchSnapshot();

  const newBundle = mergeQuery(bundle, query2);

  expect(newBundle).toMatchSnapshot();

  const doc = createDocument(newBundle.bundle);

  expect(doc).toMatchSnapshot();
  expect(print(doc)).toMatchSnapshot();
});

test("Advanced createBundle", () => {
  const query = parse(
    `
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
  `,
    {
      noLocation: true,
    },
  );
  const b = createBundle(query);

  expect(b).toMatchSnapshot();

  const doc = createDocument(b);

  expect(doc).toMatchSnapshot();
  expect(print(doc)).toMatchSnapshot();
});
test("Advanced mergeQuery", () => {
  const b = createBundle(
    parse(
      `query Foo($param: String) {
    getIt(value: $param) {
      result
    }
  }`,
      {
        noLocation: true,
      },
    ),
  );

  expect(b).toMatchSnapshot();

  const b2 = mergeQuery(
    b,
    parse(
      `fragment Foo on Bar { test }
  query Baz($param: String) {
    bopIt(value: $param) {
      result
      ...Foo
    }
  }`,
      {
        noLocation: true,
      },
    ),
  );

  expect(b2).toMatchSnapshot();

  const doc = createDocument(b2.bundle);

  expect(doc).toMatchSnapshot();
  expect(print(doc)).toMatchSnapshot();
});

test("mergeQuery with fragments", () => {
  const b = createBundle(
    parse(
      `fragment Foo on Bar { info test }

  query Foo($param: String) {
    getIt(value: $param) {
      result
      ...Foo
    }
  }`,
      {
        noLocation: true,
      },
    ),
  );

  expect(b).toMatchSnapshot();

  const b2 = mergeQuery(
    b,
    parse(
      `fragment Foo on Bar { test }
  query Baz($param: String) {
    bopIt(value: $param) {
      result
      ...Foo
    }
  }`,
      {
        noLocation: true,
      },
    ),
  );

  expect(b2).toMatchSnapshot();

  const doc = createDocument(b2.bundle);

  expect(doc).toMatchSnapshot();
  expect(print(doc)).toMatchSnapshot();
});
