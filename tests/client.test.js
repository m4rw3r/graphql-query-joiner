/* @flow */

import type { Client } from "../src";

import test from "ava";
import dummee from "dummee";
import { parse, print } from "graphql/language";
import { createBundle, createDocument } from "../src/bundle";
import { enqueue, handleFetchResponse, groupErrors, runGroup } from "../src/client";
import { queryError } from "../src/error";

// Type tests
((_query: any, _vars: any): Promise<any> => Promise.resolve("Dummy client"): Client<{}>);

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

test("handleFetchResponse text throw not ok", async t => {
  const err = new Error("Failed test-reading");
  const response = {
    ok: false,
    status: 123,
    text: dummee(() => new Promise((resolve, reject) => reject(err))),
  };

  const error = await t.throwsAsync(async () => {
    await handleFetchResponse((response: any));
  }, { message: "Failed test-reading" });

  t.is(error, err);
  t.deepEqual(response.text.calls, [
    { args: [] },
  ]);
});

test("handleFetchResponse text throw ok", async t => {
  const err = new Error("Failed test-reading");
  const response = {
    ok: true,
    status: 200,
    text: dummee(() => new Promise((resolve, reject) => reject(err))),
  };

  const error = await t.throwsAsync(
    async () => handleFetchResponse((response: any)),
    { message: "Failed test-reading" }
  );

  t.is(error, err);
  t.deepEqual(response.text.calls, [
    { args: [] },
  ]);
});

test("handleFetchResponse not ok", async t => {
  const response = {
    ok: false,
    status: 123,
    text: dummee(() => new Promise(resolve => resolve(`{"data": { "info": true } }`))),
  };

  const error = await t.throwsAsync(
    async () => handleFetchResponse((response: any)),
    { name: "RequestError", message: "Received status code 123" }
  );

  t.is(error.statusCode, 123);
  t.is(error.bodyText, `{"data": { "info": true } }`);
  t.is(error.response, response);
  t.deepEqual(response.text.calls, [
    { args: [] },
  ]);
});

test("handleFetchResponse ok bad JSON", async t => {
  const response = {
    ok: true,
    status: 200,
    text: dummee(() => new Promise(resolve => resolve("The text"))),
  };

  const error = await t.throwsAsync(
    async () => handleFetchResponse((response: any)),
    { name: "ParseError", message: "SyntaxError: Unexpected token T in JSON at position 0" }
  );

  t.is(error.statusCode, 200);
  t.is(error.bodyText, "The text");
  t.is(error.response, response);
  t.deepEqual(response.text.calls, [
    { args: [] },
  ]);
});

test("handleFetchResponse", async t => {
  const response = {
    ok: true,
    status: 200,
    text: dummee(() => new Promise(resolve => resolve(`{"data": { "info": true } }`))),
  };

  const data = await handleFetchResponse((response: any));

  t.deepEqual(data, {
    data: {
      info: true,
    },
  });
  t.deepEqual(response.text.calls, [
    { args: [] },
  ]);
});

test("groupErrors empty", t => {
  t.deepEqual(groupErrors([], []), []);
  t.deepEqual(groupErrors([], [["foo"]]), [[]]);
  t.deepEqual(groupErrors([], [["foo", "bar"]]), [[]]);
  t.deepEqual(groupErrors([], [["foo", "bar"], ["baz"]]), [[], []]);
});

test("groupError bad error", t => {
  t.deepEqual(groupErrors([{ message: "foo", path: [] }], [["foo"]]), [[{ message: "foo", path: [] }]]);
  t.deepEqual(groupErrors([{ message: "foo", path: [] }], [["foo", "bar"]]), [[{ message: "foo", path: [] }]]);
  t.deepEqual(groupErrors([{ message: "foo", path: [] }], [["foo"], ["bar"]]), [[{ message: "foo", path: [] }], [{ message: "foo", path: [] }]]);

  t.deepEqual(groupErrors([({ message: "foo", path: null }: any)], [["foo"]]), [[{ message: "foo", path: null }]]);
  t.deepEqual(groupErrors([({ message: "foo", path: null }: any)], [["foo", "bar"]]), [[{ message: "foo", path: null }]]);
  t.deepEqual(groupErrors([({ message: "foo", path: null }: any)], [["foo"], ["bar"]]), [[{ message: "foo", path: null }], [{ message: "foo", path: null }]]);

  t.deepEqual(groupErrors([({ message: "foo" }: any)], [["foo"]]), [[{ message: "foo" }]]);
  t.deepEqual(groupErrors([({ message: "foo" }: any)], [["foo", "bar"]]), [[{ message: "foo" }]]);
  t.deepEqual(groupErrors([({ message: "foo" }: any)], [["foo"], ["bar"]]), [[{ message: "foo" }], [{ message: "foo" }]]);
});

test("groupError", t => {
  t.deepEqual(groupErrors([{ message: "foo", path: ["foo"] }], [["foo"]]), [[{ message: "foo", path: ["foo"] }]]);
  t.deepEqual(groupErrors([{ message: "foo", path: ["bar"] }], [["foo"]]), [[{ message: "foo", path: ["bar"] }]]);
  t.deepEqual(groupErrors([{ message: "foo", path: ["foo"] }], [["foo", "bar"]]), [[{ message: "foo", path: ["foo"] }]]);
  t.deepEqual(groupErrors([{ message: "foo", path: ["foo"] }], [["foo"], ["bar"]]), [[{ message: "foo", path: ["foo"] }], []]);
  t.deepEqual(groupErrors([{ message: "foo", path: ["bar"] }], [["foo"], ["bar"]]), [[], [{ message: "foo", path: ["bar"] }]]);
  t.deepEqual(groupErrors([{ message: "foo", path: ["baz"] }], [["foo"], ["bar"]]), [[{ message: "foo", path: ["baz"] }], [{ message: "foo", path: ["baz"] }]]);
  t.deepEqual(groupErrors([{ message: "foo", path: ["foo", "bar"] }], [["foo"], ["bar"]]), [[{ message: "foo", path: ["foo", "bar"] }], []]);
});

test("runGroup", async t => {
  const info = { name: "info" };
  const resolve = dummee();
  const reject = dummee();
  const runQuery = dummee(() => {
    return new Promise(resolve => resolve({ data: { info } }));
  });
  const group = {
    bundle: createBundle(parse("{ info }")),
    variables: {},
    fieldMap: [{ info: "info" }],
    promises: [{ resolve, reject }],
  };

  const result = runGroup(runQuery, group);

  t.true(result instanceof Promise);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);
  t.snapshot(runQuery.calls);

  const data = await result;

  t.is(undefined, data);
  t.deepEqual(resolve.calls, [{
    args: [
      {
        info: {
          name: "info",
        },
      },
    ],
  }]);
  t.deepEqual(reject.calls, []);
  t.deepEqual(resolve.calls, [{
    args: [
      {
        info: {
          name: "info",
        },
      },
    ],
  }]);
  t.is(resolve.calls[0].args[0].info, info);
});

test("runGroup error", async t => {
  const resolve = dummee();
  const reject = dummee();
  const resolve2 = dummee();
  const reject2 = dummee();
  const error = new Error("test error");
  const runQuery = dummee(() => {
    return new Promise((resolve, reject) => reject(error));
  });
  const group = {
    bundle: createBundle(parse("{ info }")),
    variables: {},
    fieldMap: [
      { info: "info" },
      { info: "info_1" },
    ],
    promises: [
      { resolve, reject },
      { resolve: resolve2, reject: reject2 },
    ],
  };

  const result = runGroup(runQuery, group);

  t.true(result instanceof Promise);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);
  t.deepEqual(resolve2.calls, []);
  t.deepEqual(reject2.calls, []);
  t.snapshot(runQuery.calls);

  const data = await result;

  t.is(undefined, data);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, [{
    args: [
      error,
    ],
  }]);
  t.deepEqual(resolve2.calls, []);
  t.deepEqual(reject2.calls, [{
    args: [
      error,
    ],
  }]);
});

test("runGroup split", async t => {
  const info = { name: "info" };
  const info2 = { name: "info2" };
  const resolve = dummee();
  const reject = dummee();
  const resolve2 = dummee();
  const reject2 = dummee();
  const runQuery = dummee(() => {
    return new Promise(resolve => resolve({
      data: {
        info,
        "info_1": info2,
      },
    }));
  });
  const group = {
    bundle: createBundle(parse("{ info }")),
    variables: {},
    fieldMap: [
      { info: "info" },
      { info: "info_1" },
    ],
    promises: [
      { resolve, reject },
      { resolve: resolve2, reject: reject2 },
    ],
  };

  const result = runGroup(runQuery, group);

  t.true(result instanceof Promise);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);
  t.deepEqual(resolve2.calls, []);
  t.deepEqual(reject2.calls, []);
  t.snapshot(runQuery.calls);

  const data = await result;

  t.is(undefined, data);
  t.deepEqual(reject.calls, []);
  t.deepEqual(resolve.calls, [{
    args: [
      {
        info: {
          name: "info",
        },
      },
    ],
  }]);
  t.is(resolve.calls[0].args[0].info, info);
  t.deepEqual(reject2.calls, []);
  t.deepEqual(resolve2.calls, [{
    args: [
      {
        info: {
          name: "info2",
        },
      },
    ],
  }]);
  t.is(resolve2.calls[0].args[0].info, info2);
});

test("runGroup error split", async t => {
  const info = { name: "info" };
  const resolve = dummee();
  const reject = dummee();
  const resolve2 = dummee();
  const reject2 = dummee();
  const error1 = {
    message: "This error",
    path: ["info_1"],
  };
  const runQuery = dummee(() => {
    return new Promise(resolve => resolve({
      errors: [
        error1,
      ],
      data: {
        info,
      },
    }));
  });
  const group = {
    bundle: createBundle(parse("{ info }")),
    variables: {},
    fieldMap: [
      { info: "info" },
      { info: "info_1" },
    ],
    promises: [
      { resolve, reject },
      { resolve: resolve2, reject: reject2 },
    ],
  };

  const result = runGroup(runQuery, group);

  t.true(result instanceof Promise);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);
  t.deepEqual(resolve2.calls, []);
  t.deepEqual(reject2.calls, []);
  t.snapshot(runQuery.calls);

  const data = await result;

  t.is(undefined, data);
  t.deepEqual(reject.calls, []);
  t.deepEqual(resolve.calls, [{
    args: [
      {
        info: {
          name: "info",
        },
      },
    ],
  }]);
  t.is(resolve.calls[0].args[0].info, info);
  t.deepEqual(reject2.calls, [{
    args: [
      queryError([error1]),
    ],
  }]);
  t.deepEqual(resolve2.calls, []);
});

test("runGroup error split multiple", async t => {
  const info = { name: "info" };
  const info2 = { name: "info2" };
  const resolve = dummee();
  const reject = dummee();
  const resolve2 = dummee();
  const reject2 = dummee();
  const error0 = {
    message: "This error",
    path: ["info"],
  };
  const error1 = {
    message: "This error 1",
    path: ["info_1"],
  };
  const error2 = {
    message: "This error 2",
    path: [],
  };
  const runQuery = dummee(() => {
    return new Promise(resolve => resolve({
      errors: [
        error0,
        error1,
        error2,
      ],
      data: {
        info,
        "info_1": info2,
      },
    }));
  });
  const group = {
    bundle: createBundle(parse("{ info }")),
    variables: {},
    fieldMap: [
      { info: "info" },
      { info: "info_1" },
    ],
    promises: [
      { resolve, reject },
      { resolve: resolve2, reject: reject2 },
    ],
  };

  const result = runGroup(runQuery, group);

  t.true(result instanceof Promise);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject.calls, []);
  t.deepEqual(resolve2.calls, []);
  t.deepEqual(reject2.calls, []);
  t.snapshot(runQuery.calls);

  const data = await result;

  t.is(undefined, data);
  t.deepEqual(reject.calls, [{
    args: [
      queryError([error0, error2]),
    ],
  }]);
  t.deepEqual(resolve.calls, []);
  t.deepEqual(reject2.calls, [{
    args: [
      queryError([error1, error2]),
    ],
  }]);
  t.deepEqual(resolve2.calls, []);
});
