/* @flow */

import test from "ava";
import dummee from "dummee";
import { parse, print } from "graphql/language";
import { createBundle, createDocument } from "./bundle";
import { enqueue, handleResponse } from "./client";

test("enqueue missing parameters", t => {
  const resolve = dummee();
  const reject = dummee();
  const bundle = createBundle(parse("query ($foo: String) { info }"));
  const queue = [];
  const parameters = { foo: "test" };

  t.throws(() => enqueue(queue, bundle, undefined, resolve, reject), {
    message: "Variable 'foo' is missing.",
  });
  t.deepEqual(queue, []);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);

  t.throws(() => enqueue(queue, bundle, {}, resolve, reject), {
    message: "Variable 'foo' is missing.",
  });
  t.deepEqual(queue, []);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);

  enqueue(queue, bundle, parameters, resolve, reject);
  t.is(queue.length, 1);
  t.deepEqual(queue[0].variables, { foo: "test" });
  t.not(queue[0].variables, parameters);
  t.deepEqual(queue[0].fieldMap, [
    { info: "info" },
  ]);
  t.deepEqual(queue[0].promises, [
    { resolve, reject },
  ]);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);

  t.throws(() => enqueue(queue, bundle, undefined, resolve, reject), {
    message: "Variable 'foo' is missing.",
  });
  t.is(queue.length, 1);
  t.deepEqual(queue[0].variables, { foo: "test" });
  t.deepEqual(queue[0].fieldMap, [
    { info: "info" },
  ]);
  t.deepEqual(queue[0].promises, [
    { resolve, reject },
  ]);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);

  t.throws(() => enqueue(queue, bundle, {}, resolve, reject), {
    message: "Variable 'foo' is missing.",
  });
  t.is(queue.length, 1);
  t.deepEqual(queue[0].variables, { foo: "test" });
  t.deepEqual(queue[0].fieldMap, [
    { info: "info" },
  ]);
  t.deepEqual(queue[0].promises, [
    { resolve, reject },
  ]);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);
});

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
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);

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
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);
  t.deepEqual(resolve2.calls, []);
  t.deepEqual(reject2.calls, []);

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
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);
  t.deepEqual(resolve2.calls, []);
  t.deepEqual(reject2.calls, []);
  t.deepEqual(resolve3.calls, []);
  t.deepEqual(reject3.calls, []);
});

test("enqueue different", t => {
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
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);

  const bundle2 = createBundle(parse("mutation ($theparam: String) { doIt }", { noLocation: true }));
  const resolve2 = dummee();
  const reject2 = dummee();

  t.is(enqueue(queue, bundle2, { theparam: "foo" }, resolve2, reject2), undefined);
  t.is(queue.length, 2);
  t.is(queue[0].bundle, bundle);
  t.is(queue[1].bundle, bundle2);
  t.deepEqual(queue[0].variables, {});
  t.deepEqual(queue[1].variables, { theparam: "foo" });
  t.deepEqual(queue[0].fieldMap, [
    { info: "info" },
  ]);
  t.deepEqual(queue[1].fieldMap, [
    { doIt: "doIt" },
  ]);
  t.deepEqual(queue[0].promises, [
    { resolve, reject },
  ]);
  t.deepEqual(queue[1].promises, [
    { resolve: resolve2, reject: reject2 },
  ]);
  t.is(print(createDocument(queue[0].bundle)), `{
  info
}
`);
  t.is(print(createDocument(queue[1].bundle)), `mutation ($theparam: String) {
  doIt
}
`);
  t.is(queue[1].promises[0].resolve, resolve2);
  t.is(queue[1].promises[0].reject, reject2);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);
  t.deepEqual(resolve2.calls, []);
  t.deepEqual(reject2.calls, []);

  const resolve3 = dummee();
  const reject3 = dummee();

  t.is(enqueue(queue, bundle, undefined, resolve3, reject3), undefined);
  t.is(queue.length, 3);
  t.is(queue[0].bundle, bundle);
  t.is(queue[1].bundle, bundle2);
  t.is(queue[2].bundle, bundle);
  t.deepEqual(queue[0].variables, {});
  t.deepEqual(queue[1].variables, { theparam: "foo" });
  t.deepEqual(queue[2].variables, {});
  t.deepEqual(queue[0].fieldMap, [
    { info: "info" },
  ]);
  t.deepEqual(queue[1].fieldMap, [
    { doIt: "doIt" },
  ]);
  t.deepEqual(queue[2].fieldMap, [
    { info: "info" },
  ]);
  t.deepEqual(queue[0].promises, [
    { resolve, reject },
  ]);
  t.deepEqual(queue[1].promises, [
    { resolve: resolve2, reject: reject2 },
  ]);
  t.deepEqual(queue[2].promises, [
    { resolve: resolve3, reject: reject3 },
  ]);
  t.is(queue[2].promises[0].resolve, resolve3);
  t.is(queue[2].promises[0].reject, reject3);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);
  t.deepEqual(resolve2.calls, []);
  t.deepEqual(reject2.calls, []);
  t.deepEqual(resolve3.calls, []);
  t.deepEqual(reject3.calls, []);
});

test("handleResponse text throw not ok", async t => {
  const err = new Error("Failed test-reading");
  const response = {
    ok: false,
    status: 123,
    text: dummee(() => new Promise((resolve, reject) => reject(err))),
  };

  const error = await t.throwsAsync(async () => {
    await handleResponse((response: any));
  }, { message: "Failed test-reading" });

  t.is(error, err);
  t.deepEqual(response.text.calls, [
    { args: [] },
  ]);
});

test("handleResponse text throw ok", async t => {
  const err = new Error("Failed test-reading");
  const response = {
    ok: true,
    status: 200,
    text: dummee(() => new Promise((resolve, reject) => reject(err))),
  };

  const error = await t.throwsAsync(
    async () => handleResponse((response: any)),
    { message: "Failed test-reading" }
  );

  t.is(error, err);
  t.deepEqual(response.text.calls, [
    { args: [] },
  ]);
});

test("handleResponse not ok", async t => {
  const response = {
    ok: false,
    status: 123,
    text: dummee(() => new Promise(resolve => resolve(`{"data": { "info": true } }`))),
  };

  const error = await t.throwsAsync(
    async () => handleResponse((response: any)),
    { name: "RequestError", message: "Received status code 123" }
  );

  t.is(error.statusCode, 123);
  t.is(error.bodyText, `{"data": { "info": true } }`);
  t.is(error.response, response);
  t.deepEqual(response.text.calls, [
    { args: [] },
  ]);
});

test("handleResponse ok bad JSON", async t => {
  const response = {
    ok: true,
    status: 200,
    text: dummee(() => new Promise(resolve => resolve("The text"))),
  };

  const error = await t.throwsAsync(
    async () => handleResponse((response: any)),
    { name: "ParseError", message: "SyntaxError: Unexpected token T in JSON at position 0" }
  );

  t.is(error.statusCode, 200);
  t.is(error.bodyText, "The text");
  t.is(error.response, response);
  t.deepEqual(response.text.calls, [
    { args: [] },
  ]);
});

test("handleResponse", async t => {
  const response = {
    ok: true,
    status: 200,
    text: dummee(() => new Promise(resolve => resolve(`{"data": { "info": true } }`))),
  };

  const data = await handleResponse((response: any));

  t.deepEqual(data, {
    data: {
      info: true,
    },
  });
  t.deepEqual(response.text.calls, [
    { args: [] },
  ]);
});
