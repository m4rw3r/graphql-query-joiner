/* @flow */

import test from "ava";
import { parse } from "graphql/language";

import { createRequest, joinRequests, createDocument } from "./query";

test("createRequest missing param", t => {
  const doc = parse(`
    query ($param: String!) {
      field
    }
  `, { noLocation: true });

  t.throws(() => createRequest("theprefix", doc, {}));
});

test("createRequest extra param", t => {
  const doc = parse(`
    query ($param: String!) {
      field
    }
  `, { noLocation: true });

  t.throws(() => createRequest("theprefix", doc, { other: "param" }));
});

test("createRequest", t => {
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

  t.snapshot(createRequest("theprefix", doc, { param: "test" }));
});
