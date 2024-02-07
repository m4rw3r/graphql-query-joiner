import type { Group, QueryRunner } from "./client";
import type { GraphQLError } from "./query";

import { parse, print } from "graphql/language";
import { createBundle, createDocument } from "./bundle";
import {
  enqueue,
  handleFetchResponse,
  groupErrors,
  runGroup,
} from "../src/client";
import { queryError } from "./error";

test("enqueue missing parameters", () => {
  const resolve = jest.fn();
  const reject = jest.fn();
  const bundle = createBundle(parse("query ($foo: String) { info }"));
  const queue: Group[] = [];
  const parameters = { foo: "test" };

  expect(() => enqueue(queue, bundle, undefined, resolve, reject)).toThrow(
    "Variable 'foo' is missing.",
  );

  expect(queue).toEqual([]);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(() => enqueue(queue, bundle, {}, resolve, reject)).toThrow(
    "Variable 'foo' is missing.",
  );
  expect(queue).toEqual([]);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);

  enqueue(queue, bundle, parameters, resolve, reject);

  expect(queue).toHaveLength(1);
  expect(queue[0]!.variables).toEqual({ foo: "test" });
  expect(queue[0]!.variables).not.toBe(parameters);
  expect(queue[0]!.queries).toEqual([
    {
      renamedFields: {
        info: "info",
      },
      resolve,
      reject,
    },
  ]);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(() => enqueue(queue, bundle, undefined, resolve, reject)).toThrow(
    "Variable 'foo' is missing.",
  );
  expect(queue.length).toBe(1);
  expect(queue[0]!.variables).toEqual({ foo: "test" });
  expect(queue[0]!.queries).toEqual([
    {
      renamedFields: {
        info: "info",
      },
      resolve,
      reject,
    },
  ]);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(() => enqueue(queue, bundle, {}, resolve, reject)).toThrow(
    "Variable 'foo' is missing.",
  );
  expect(queue.length).toBe(1);
  expect(queue[0]!.variables).toEqual({ foo: "test" });
  expect(queue[0]!.queries).toEqual([
    {
      renamedFields: {
        info: "info",
      },
      resolve,
      reject,
    },
  ]);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
});

test("enqueue first", () => {
  const queue: Group[] = [];
  const bundle = createBundle(parse("query { info }", { noLocation: true }));
  const resolve = jest.fn();
  const reject = jest.fn();

  expect(enqueue(queue, bundle, undefined, resolve, reject)).toBe(undefined);
  expect(queue).toEqual([
    {
      bundle,
      variables: {},
      queries: [
        {
          renamedFields: {
            info: "info",
          },
          resolve,
          reject,
        },
      ],
    },
  ]);
  expect(queue[0]!.bundle).toBe(bundle);
  expect(print(createDocument(queue[0]!.bundle))).toBe(`{
  info
}`);
  expect(queue[0]!.queries[0]!.resolve).toBe(resolve);
  expect(queue[0]!.queries[0]!.reject).toBe(reject);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);

  const bundle2 = createBundle(parse("query { info }", { noLocation: true }));
  const resolve2 = jest.fn();
  const reject2 = jest.fn();

  expect(enqueue(queue, bundle2, undefined, resolve2, reject2)).toBe(undefined);
  expect(queue.length).toBe(1);
  expect(queue[0]!.bundle).not.toBe(bundle);
  expect(queue[0]!.bundle).not.toBe(bundle2);
  expect(queue[0]!.variables).toEqual({});
  expect(queue[0]!.queries).toEqual([
    {
      renamedFields: {
        info: "info",
      },
      resolve,
      reject,
    },
    {
      renamedFields: {
        info: "info_1",
      },
      resolve: resolve2,
      reject: reject2,
    },
  ]);
  expect(queue[0]!.bundle).not.toBe(bundle);
  expect(print(createDocument(queue[0]!.bundle))).toBe(`{
  info
  info_1: info
}`);
  expect(queue[0]!.queries[1]!.resolve).toBe(resolve2);
  expect(queue[0]!.queries[1]!.reject).toBe(reject2);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);

  const bundle3 = createBundle(
    parse("query ($param: String) { getIt(foo: $param) }", {
      noLocation: true,
    }),
  );
  const resolve3 = jest.fn();
  const reject3 = jest.fn();

  expect(enqueue(queue, bundle3, { param: "abc" }, resolve3, reject3)).toBe(
    undefined,
  );
  expect(queue.length).toBe(1);
  expect(queue[0]!.variables).toEqual({ param: "abc" });
  expect(queue[0]!.queries).toEqual([
    {
      renamedFields: {
        info: "info",
      },
      resolve,
      reject,
    },
    {
      renamedFields: {
        info: "info_1",
      },
      resolve: resolve2,
      reject: reject2,
    },
    {
      renamedFields: {
        getIt: "getIt",
      },
      resolve: resolve3,
      reject: reject3,
    },
  ]);
  expect(queue[0]!.bundle).not.toBe(bundle);
  expect(queue[0]!.bundle).not.toBe(bundle2);
  expect(queue[0]!.bundle).not.toBe(bundle3);
  expect(print(createDocument(queue[0]!.bundle))).toBe(`query ($param: String) {
  info
  info_1: info
  getIt(foo: $param)
}`);
  expect(queue[0]!.queries[1]!.resolve).toBe(resolve2);
  expect(queue[0]!.queries[1]!.reject).toBe(reject2);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);
  expect(resolve3).toHaveBeenCalledTimes(0);
  expect(reject3).toHaveBeenCalledTimes(0);
});

test("enqueue different", () => {
  const queue: Group[] = [];
  const bundle = createBundle(
    parse("query { info }", {
      noLocation: true,
    }),
  );
  const resolve = jest.fn();
  const reject = jest.fn();

  expect(enqueue(queue, bundle, undefined, resolve, reject)).toBe(undefined);
  expect(queue).toEqual([
    {
      bundle,
      variables: {},
      queries: [
        {
          renamedFields: {
            info: "info",
          },
          resolve,
          reject,
        },
      ],
    },
  ]);
  expect(queue[0]!.bundle).toBe(bundle);
  expect(print(createDocument(queue[0]!.bundle))).toBe(`{
  info
}`);
  expect(queue[0]!.queries[0]!.resolve).toBe(resolve);
  expect(queue[0]!.queries[0]!.reject).toBe(reject);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);

  const bundle2 = createBundle(
    parse("mutation ($theparam: String) { doIt }", { noLocation: true }),
  );
  const resolve2 = jest.fn();
  const reject2 = jest.fn();

  expect(enqueue(queue, bundle2, { theparam: "foo" }, resolve2, reject2)).toBe(
    undefined,
  );
  expect(queue.length).toBe(2);
  expect(queue[0]!.bundle).toBe(bundle);
  expect(queue[1]!.bundle).toBe(bundle2);
  expect(queue[0]!.variables).toEqual({});
  expect(queue[1]!.variables).toEqual({ theparam: "foo" });
  expect(queue[0]!.queries).toEqual([
    {
      renamedFields: {
        info: "info",
      },
      resolve,
      reject,
    },
  ]);
  expect(queue[1]!.queries).toEqual([
    {
      renamedFields: {
        doIt: "doIt",
      },
      resolve: resolve2,
      reject: reject2,
    },
  ]);
  expect(print(createDocument(queue[0]!.bundle))).toBe(`{
  info
}`);
  expect(print(createDocument(queue[1]!.bundle)))
    .toBe(`mutation ($theparam: String) {
  doIt
}`);
  expect(queue[1]!.queries[0]!.resolve).toBe(resolve2);
  expect(queue[1]!.queries[0]!.reject).toBe(reject2);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);

  const resolve3 = jest.fn();
  const reject3 = jest.fn();

  expect(enqueue(queue, bundle, undefined, resolve3, reject3)).toBe(undefined);
  expect(queue.length).toBe(3);
  expect(queue[0]!.bundle).toBe(bundle);
  expect(queue[1]!.bundle).toBe(bundle2);
  expect(queue[2]!.bundle).toBe(bundle);
  expect(queue[0]!.variables).toEqual({});
  expect(queue[1]!.variables).toEqual({
    theparam: "foo",
  });
  expect(queue[2]!.variables).toEqual({});
  expect(queue[0]!.queries).toEqual([
    {
      renamedFields: {
        info: "info",
      },
      resolve,
      reject,
    },
  ]);
  expect(queue[1]!.queries).toEqual([
    {
      renamedFields: {
        doIt: "doIt",
      },
      resolve: resolve2,
      reject: reject2,
    },
  ]);
  expect(queue[2]!.queries).toEqual([
    {
      renamedFields: {
        info: "info",
      },
      resolve: resolve3,
      reject: reject3,
    },
  ]);
  expect(queue[2]!.queries[0]!.resolve).toBe(resolve3);
  expect(queue[2]!.queries[0]!.reject).toBe(reject3);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);
  expect(resolve3).toHaveBeenCalledTimes(0);
  expect(reject3).toHaveBeenCalledTimes(0);
});

test("handleFetchResponse text throw not ok", async () => {
  const testError = new Error("Failed test-reading");
  const response = {
    ok: false,
    status: 123,
    text: jest.fn(() => new Promise((_, reject) => reject(testError))),
  };
  let error: any;

  try {
    await handleFetchResponse(response as any);
  } catch (e) {
    error = e;
  }

  expect(error).toBe(testError);
  expect(response.text).toHaveBeenCalledTimes(1);
  expect(response.text).toHaveBeenCalledWith();
});

test("handleFetchResponse text throw ok", async () => {
  const testError = new Error("Failed test-reading");
  const response = {
    ok: true,
    status: 200,
    text: jest.fn(() => new Promise((_, reject) => reject(testError))),
  };
  let error: any;

  try {
    await handleFetchResponse(response as any);
  } catch (e) {
    error = e;
  }

  expect(error).toBe(testError);
  expect(response.text).toHaveBeenCalledTimes(1);
  expect(response.text).toHaveBeenCalledWith();
});

test("handleFetchResponse not ok", async () => {
  const response = {
    ok: false,
    status: 123,
    text: jest.fn(
      () => new Promise((resolve) => resolve(`{"data": { "info": true } }`)),
    ),
  };
  let error: any;

  try {
    await handleFetchResponse(response as any);
  } catch (e) {
    error = e;
  }

  expect(error.name).toBe("RequestError");
  expect(error.message).toBe("Received status code 123");
  expect(error.statusCode).toBe(123);
  expect(error.bodyText).toBe(`{"data": { "info": true } }`);
  expect(error.response).toBe(response);
  expect(response.text).toHaveBeenCalledTimes(1);
  expect(response.text).toHaveBeenCalledWith();
});

test("handleFetchResponse ok bad JSON", async () => {
  const response = {
    ok: true,
    status: 200,
    text: jest.fn(() => new Promise((resolve) => resolve("The text"))),
  };
  let error: any;

  try {
    await handleFetchResponse(response as any);
  } catch (e) {
    error = e;
  }

  expect(error.name).toBe("ParseError");
  expect(error.message).toMatch(/SyntaxError: Unexpected token/);
  expect(error.statusCode).toBe(200);
  expect(error.bodyText).toBe("The text");
  expect(error.response).toBe(response);
  expect(response.text).toHaveBeenCalledTimes(1);
  expect(response.text).toHaveBeenCalledWith();
});

test("handleFetchResponse", async () => {
  const response = {
    ok: true,
    status: 200,
    text: jest.fn(
      () => new Promise((resolve) => resolve(`{"data": { "info": true } }`)),
    ),
  };
  const data = await handleFetchResponse(response as any);

  expect(data).toEqual({ data: { info: true } });
  expect(response.text).toHaveBeenCalledTimes(1);
  expect(response.text).toHaveBeenCalledWith();
});

// prettier-ignore
test("groupErrors empty", () => {
  expect(groupErrors([], [])).toEqual([]);
  expect(groupErrors([], [{ renamedFields: { foo: "foo" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [] }]);
  expect(groupErrors([], [{ renamedFields: { foo: "foo", bar: "bar" } }])).toEqual([{ renamedFields: { foo: "foo", bar: "bar" }, errors: [] }]);
  expect(groupErrors([], [{ renamedFields: { foo: "foo", bar: "bar" } }, { renamedFields: { baz: "baz" } }])).toEqual([{ renamedFields: { foo: "foo", bar: "bar" }, errors: [] }, { renamedFields: { baz: "baz" }, errors: [] }]);
});

// prettier-ignore
test("groupError bad error", () => {
  expect(groupErrors([{ message: "foo", path: [] }], [{ renamedFields: { foo: "foo" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [{ message: "foo", path: [] }] }]);
  expect(groupErrors([{ message: "foo", path: [] }], [{ renamedFields: { foo: "foo", bar: "bar" } }])).toEqual([{ renamedFields: { foo: "foo", bar: "bar" }, errors: [{ message: "foo", path: [] }] }]);
  expect(groupErrors([{ message: "foo", path: [] }], [{ renamedFields: { foo: "foo" } }, { renamedFields: { bar: "bar" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [{ message: "foo", path: [] }] }, { renamedFields: { bar: "bar" }, errors: [{ message: "foo", path: [] }] }]);
  expect(groupErrors([{ message: "foo", path: null } as any], [{ renamedFields: { foo: "foo" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [{ message: "foo", path: null }] }]);
  expect(groupErrors([{ message: "foo", path: null } as any], [{ renamedFields: { foo: "foo", bar: "bar" } }])).toEqual([{ renamedFields: { foo: "foo", bar: "bar" }, errors: [{ message: "foo", path: null }] }]);
  expect(groupErrors([{ message: "foo", path: null } as any], [{ renamedFields: { foo: "foo" } }, { renamedFields: { bar: "bar" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [{ message: "foo", path: null }] }, { renamedFields: { bar: "bar" }, errors: [{ message: "foo", path: null }] }]);
  expect(groupErrors([{ message: "foo" } as any], [{ renamedFields: { foo: "foo" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [{ message: "foo" }] }]);
  expect(groupErrors([{ message: "foo" } as any], [{ renamedFields: { foo: "foo", bar: "bar" } }])).toEqual([{ renamedFields: { foo: "foo", bar: "bar" }, errors: [{ message: "foo" }] }]);
  expect(groupErrors([{ message: "foo" } as any], [{ renamedFields: { foo: "foo" } }, { renamedFields: { bar: "bar" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [{ message: "foo" }] }, { renamedFields: { bar: "bar" }, errors: [{ message: "foo" }] }]);
});

// prettier-ignore
test("groupError", () => {
  expect(groupErrors([{ message: "foo", path: ["foo"] }], [{ renamedFields: { foo: "foo" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [{ message: "foo", path: ["foo"] }] }]);
  expect(groupErrors([{ message: "foo", path: ["bar"] }], [{ renamedFields: { foo: "foo" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [{ message: "foo", path: ["bar"] }] }]);
  expect(groupErrors([{ message: "foo", path: ["foo"] }], [{ renamedFields: { foo: "foo", bar: "bar" } }])).toEqual([{ renamedFields: { foo: "foo", bar: "bar" }, errors: [{ message: "foo", path: ["foo"] }] }]);
  expect(groupErrors([{ message: "foo", path: ["foo"] }], [{ renamedFields: { foo: "foo" } }, { renamedFields: { foo: "bar" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [{ message: "foo", path: ["foo"] }] }, { renamedFields: { foo: "bar" }, errors: [] }]);
  expect(groupErrors([{ message: "foo", path: ["bar"] }], [{ renamedFields: { foo: "foo" } }, { renamedFields: { foo: "bar" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [] }, { renamedFields: { foo: "bar" }, errors: [{ message: "foo", path: ["bar"] }] }]);
  expect(groupErrors([{ message: "foo", path: ["baz"] }], [{ renamedFields: { foo: "foo" } }, { renamedFields: { foo: "bar" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [{ message: "foo", path: ["baz"] }] }, { renamedFields: { foo: "bar" }, errors: [{ message: "foo", path: ["baz"] }] }]);
  expect(groupErrors([{ message: "foo", path: ["foo", "bar"] }], [{ renamedFields: { foo: "foo" } }, { renamedFields: { foo: "bar" } }])).toEqual([{ renamedFields: { foo: "foo" }, errors: [{ message: "foo", path: ["foo", "bar"] }] }, { renamedFields: { foo: "bar" }, errors: [] }]);
});

test("runGroup", async () => {
  const info = { name: "info" };
  const resolve = jest.fn();
  const reject = jest.fn();
  const runQuery = jest.fn(
    () => new Promise((resolve) => resolve({ data: { info } })),
  );
  const group = {
    bundle: createBundle(parse("{ info }")),
    variables: {},
    queries: [
      {
        renamedFields: {
          info: "info",
        },
        resolve,
        reject,
      },
    ],
  };
  const result = runGroup(runQuery as QueryRunner, group);

  expect(result instanceof Promise).toBe(true);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(runQuery.mock.calls).toMatchSnapshot();

  const data = await result;

  expect(undefined).toBe(data);
  expect(resolve).toHaveBeenCalledTimes(1);
  expect(resolve).toHaveBeenCalledWith({ info: { name: "info" } });
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve.mock.calls[0]![0]!.info).toBe(info);
});

test("runGroup error", async () => {
  const resolve = jest.fn();
  const reject = jest.fn();
  const resolve2 = jest.fn();
  const reject2 = jest.fn();
  const error = new Error("test error");
  const runQuery = jest.fn(() => new Promise((_, reject) => reject(error)));
  const group = {
    bundle: createBundle(parse("{ info }")),
    variables: {},
    queries: [
      {
        renamedFields: {
          info: "info",
        },
        resolve,
        reject,
      },
      {
        renamedFields: {
          info: "info_1",
        },
        resolve: resolve2,
        reject: reject2,
      },
    ],
  };
  const result = runGroup(runQuery as QueryRunner, group);

  expect(result instanceof Promise).toBe(true);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);
  expect(runQuery.mock.calls).toMatchSnapshot();

  const data = await result;

  expect(undefined).toBe(data);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledWith(error);
  expect(reject).toHaveBeenCalledTimes(1);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledWith(error);
  expect(reject2).toHaveBeenCalledTimes(1);
});

test("runGroup split", async () => {
  const info = { name: "info" };
  const info2 = { name: "info2" };
  const resolve = jest.fn();
  const reject = jest.fn();
  const resolve2 = jest.fn();
  const reject2 = jest.fn();
  const runQuery = jest.fn(
    () => new Promise((resolve) => resolve({ data: { info, info_1: info2 } })),
  );
  const group = {
    bundle: createBundle(parse("{ info }")),
    variables: {},
    queries: [
      {
        renamedFields: {
          info: "info",
        },
        resolve,
        reject,
      },
      {
        renamedFields: {
          info: "info_1",
        },
        resolve: resolve2,
        reject: reject2,
      },
    ],
  };
  const result = runGroup(runQuery as QueryRunner, group);

  expect(result instanceof Promise).toBe(true);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);
  expect(runQuery.mock.calls).toMatchSnapshot();

  const data = await result;

  expect(undefined).toBe(data);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve).toHaveBeenCalledWith({
    info: {
      name: "info",
    },
  });
  expect(resolve).toHaveBeenCalledTimes(1);
  expect(resolve.mock.calls[0]![0]!.info).toBe(info);
  expect(reject2).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledWith({ info: { name: "info2" } });
  expect(resolve2.mock.calls[0]![0]!.info).toBe(info2);
});

test("runGroup error split", async () => {
  const info = { name: "info" };
  const resolve = jest.fn();
  const reject = jest.fn();
  const resolve2 = jest.fn();
  const reject2 = jest.fn();
  const error1: GraphQLError = {
    message: "This error",
    path: ["info_1"],
  };
  const runQuery = jest.fn(
    () =>
      new Promise((resolve) =>
        resolve({
          errors: [error1],
          data: {
            info,
          },
        }),
      ),
  );
  const group = {
    bundle: createBundle(parse("{ info }")),
    variables: {},
    queries: [
      {
        renamedFields: {
          info: "info",
        },
        resolve,
        reject,
      },
      {
        renamedFields: {
          info: "info_1",
        },
        resolve: resolve2,
        reject: reject2,
      },
    ],
  };
  const result = runGroup(runQuery as QueryRunner, group);

  expect(result instanceof Promise).toBe(true);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);
  expect(runQuery.mock.calls).toMatchSnapshot();

  const data = await result;

  expect(undefined).toBe(data);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve).toHaveBeenCalledWith({ info: { name: "info" } });
  expect(resolve.mock.calls[0]![0]!.info).toBe(info);
  expect(reject2).toHaveBeenCalledWith(
    queryError([error1], { info: undefined }),
  );
  expect(resolve2).toHaveBeenCalledTimes(0);
});

test("runGroup error split multiple", async () => {
  const info = { name: "info" };
  const info2 = { name: "info2" };
  const resolve = jest.fn();
  const reject = jest.fn();
  const resolve2 = jest.fn();
  const reject2 = jest.fn();
  const error0: GraphQLError = { message: "This error", path: ["info"] };
  const error1: GraphQLError = { message: "This error 1", path: ["info_1"] };
  const error2: GraphQLError = { message: "This error 2" };
  const runQuery = jest.fn(
    () =>
      new Promise((resolve) =>
        resolve({
          errors: [error0, error1, error2],
          data: {
            info,
            info_1: info2,
          },
        }),
      ),
  );
  const group: Group = {
    bundle: createBundle(parse("{ info }")),
    variables: {},
    queries: [
      {
        renamedFields: {
          info: "info",
        },
        resolve,
        reject,
      },
      {
        renamedFields: {
          info: "info_1",
        },
        resolve: resolve2,
        reject: reject2,
      },
    ],
  };
  const result = runGroup(runQuery as QueryRunner, group);

  expect(result instanceof Promise).toBe(true);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);
  expect(runQuery.mock.calls).toMatchSnapshot();

  const data = await result;

  expect(undefined).toBe(data);
  expect(reject).toHaveBeenCalledWith(queryError([error0, error2], { info }));
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledWith(
    queryError([error1, error2], { info: info2 }),
  );
  expect(resolve2).toHaveBeenCalledTimes(0);
});

test("Run empty group with empty response", async () => {
  const resolve = jest.fn();
  const reject = jest.fn();
  const error1: GraphQLError = {
    message: "This error",
    path: ["info_1"],
  };

  const runQuery = () =>
    Promise.resolve({
      errors: [error1],
    });

  const group: Group = {
    bundle: createBundle(parse("{ info }")),
    variables: {},
    queries: [
      {
        renamedFields: {
          info: "info",
        },
        resolve,
        reject,
      },
    ],
  };

  const result = runGroup(runQuery, group);

  expect(result instanceof Promise).toBe(true);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);

  const data = await result;

  expect(undefined).toBe(data);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledWith(queryError([error1], {}));
});
