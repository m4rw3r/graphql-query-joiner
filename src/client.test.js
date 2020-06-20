/* @flow */

import test from "ava";
import dummee from "dummee";
import { parse, print } from "graphql/language";
import { createBundle, createDocument } from "./bundle";
import { enqueue } from "./client";

test("enqueue first", t => {
  const queue = [];
  const bundle = createBundle(parse("query { info }", { noLocation: true }));
  const resolve = dummee();
  const reject = dummee();

  t.is(enqueue(queue, bundle, undefined, resolve, reject), undefined);
  t.deepEqual(queue, [
    {
      bundle,
      variables: {},
      fieldMap: [
        { info: "info" },
      ],
      promises: [{ resolve, reject }],
    },
  ]);
  t.is(queue[0].bundle, bundle);
  t.is(print(createDocument(queue[0].bundle)), `{
  info
}
`);
  t.is(queue[0].promises[0].resolve, resolve);
  t.is(queue[0].promises[0].reject, reject);

  const bundle2 = createBundle(parse("query { info }", { noLocation: true }));
  const resolve2 = dummee();
  const reject2 = dummee();

  t.is(enqueue(queue, bundle2, undefined, resolve2, reject2), undefined);
  t.is(queue.length, 1);
  t.not(queue[0].bundle, bundle);
  t.not(queue[0].bundle, bundle2);
  t.deepEqual(queue[0].variables, {});
  t.deepEqual(queue[0].fieldMap, [
    { info: "info" },
    { info: "info_1" },
  ]);
  t.deepEqual(queue[0].promises, [
    { resolve, reject },
    { resolve: resolve2, reject: reject2 },
  ]);
  t.not(queue[0].bundle, bundle);
  t.is(print(createDocument(queue[0].bundle)), `{
  info
  info_1: info
}
`);
  t.is(queue[0].promises[1].resolve, resolve2);
  t.is(queue[0].promises[1].reject, reject2);

  const bundle3 = createBundle(parse("query ($param: String) { getIt(foo: $param) }", { noLocation: true }));
  const resolve3 = dummee();
  const reject3 = dummee();

  t.is(enqueue(queue, bundle3, { param: "abc" }, resolve3, reject3), undefined);
  t.is(queue.length, 1);
  t.deepEqual(queue[0].variables, { param: "abc" });
  t.deepEqual(queue[0].fieldMap, [
    { info: "info" },
    { info: "info_1" },
    { getIt: "getIt" },
  ]);
  t.deepEqual(queue[0].promises, [
    { resolve, reject },
    { resolve: resolve2, reject: reject2 },
    { resolve: resolve3, reject: reject3 },
  ]);
  t.not(queue[0].bundle, bundle);
  t.not(queue[0].bundle, bundle2);
  t.not(queue[0].bundle, bundle3);
  t.is(print(createDocument(queue[0].bundle)), `query ($param: String) {
  info
  info_1: info
  getIt(foo: $param)
}
`);
  t.is(queue[0].promises[1].resolve, resolve2);
  t.is(queue[0].promises[1].reject, reject2);
});
