import type { Group, RunOperation } from "./client";
import type { GraphQLError } from "./query";
import type { QueryError } from "./error";

import { parse, print } from "graphql/language";
import { createBundle, createDocument } from "./bundle";
import {
  enqueue,
  handleFetchResponse,
  groupErrors,
  runGroup,
} from "../src/client";

test("enqueue missing parameters", () => {
  const resolve = jest.fn();
  const reject = jest.fn();
  const bundle = createBundle(parse("query ($foo: String) { info }"));
  const queue: Group[] = [];
  const parameters = { foo: "test" };
  expect(() => {
    enqueue(queue, bundle, undefined, resolve, reject);
  }).toThrow("Variable 'foo' is missing.");

  expect(queue).toEqual([]);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(() => {
    enqueue(queue, bundle, {}, resolve, reject);
  }).toThrow("Variable 'foo' is missing.");
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
  expect(() => {
    enqueue(queue, bundle, undefined, resolve, reject);
  }).toThrow("Variable 'foo' is missing.");
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
  expect(() => {
    enqueue(queue, bundle, {}, resolve, reject);
  }).toThrow("Variable 'foo' is missing.");
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

  enqueue(queue, bundle, undefined, resolve, reject);

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

  enqueue(queue, bundle2, undefined, resolve2, reject2);

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

  enqueue(queue, bundle3, { param: "abc" }, resolve3, reject3);

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

  enqueue(queue, bundle, undefined, resolve, reject);

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

  enqueue(queue, bundle2, { theparam: "foo" }, resolve2, reject2);

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

  enqueue(queue, bundle, undefined, resolve3, reject3);

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

describe("handleFetchResponse", () => {
  test("text throw not ok", async () => {
    const testError = new Error("Failed test-reading");
    const response = {
      ok: false,
      status: 123,
      headers: new Headers(),
      text: jest.fn(
        () =>
          new Promise((_, reject) => {
            reject(testError);
          }),
      ),
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

  test("text throw ok", async () => {
    const testError = new Error("Failed test-reading");
    const response = {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: jest.fn(
        () =>
          new Promise((_, reject) => {
            reject(testError);
          }),
      ),
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

  test("ok, bad content type", async () => {
    const bodyText = `{"data": { "info": true } }`;
    const url = "https://example.com/graphql?missing=content";
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      url,
      headers: new Headers(),
      text: jest.fn(
        () =>
          new Promise((resolve) => {
            resolve(bodyText);
          }),
      ),
    };
    let error: any;

    try {
      await handleFetchResponse(response as any);
    } catch (e) {
      error = e;
    }

    expect(error.name).toBe("RequestError");
    expect(error.message).toBe(
      `Unexpected Content-Type none (url=https://example.com/graphql, status=200, contentType=none, bodyLength=${bodyText.length})`,
    );
    expect(error.statusCode).toBe(200);
    expect(error.requestUrl).toBe("https://example.com/graphql");
    expect(error.contentType).toBeNull();
    expect(error.bodyLength).toBe(bodyText.length);
    expect(response.text).toHaveBeenCalledTimes(1);
    expect(response.text).toHaveBeenCalledWith();
  });

  test("ok, bad content type with trace header", async () => {
    const bodyText = `{"data": { "info": true } }`;
    const url = "https://example.com/graphql?trace=request";
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      url,
      headers: new Headers([["x-request-id", "req-123"]]),
      text: jest.fn(
        () =>
          new Promise((resolve) => {
            resolve(bodyText);
          }),
      ),
    };
    let error: any;

    try {
      await handleFetchResponse(response as any);
    } catch (e) {
      error = e;
    }

    expect(error.name).toBe("RequestError");
    expect(error.message).toBe(
      `Unexpected Content-Type none (url=https://example.com/graphql, status=200, contentType=none, bodyLength=${bodyText.length}, x-request-id=req-123)`,
    );
    expect(error.traceHeader).toEqual({
      name: "x-request-id",
      value: "req-123",
    });
    expect(response.text).toHaveBeenCalledTimes(1);
    expect(response.text).toHaveBeenCalledWith();
  });

  test("not ok, bad content type", async () => {
    const bodyText = `{"data": { "info": true } }`;
    const url = "https://example.com/graphql?status=400";
    const response = {
      ok: false,
      status: 400,
      statusText: "Bad Request",
      url,
      headers: new Headers(),
      text: jest.fn(
        () =>
          new Promise((resolve) => {
            resolve(bodyText);
          }),
      ),
    };
    let error: any;

    try {
      await handleFetchResponse(response as any);
    } catch (e) {
      error = e;
    }

    expect(error.name).toBe("RequestError");
    expect(error.message).toBe(
      `Received status 400 Bad Request (url=https://example.com/graphql, status=400, contentType=none, bodyLength=${bodyText.length})`,
    );
    expect(error.statusCode).toBe(400);
    expect(error.requestUrl).toBe("https://example.com/graphql");
    expect(error.contentType).toBeNull();
    expect(error.bodyLength).toBe(bodyText.length);
    expect(response.text).toHaveBeenCalledTimes(1);
    expect(response.text).toHaveBeenCalledWith();
  });

  test("ok bad JSON", async () => {
    const bodyText = "The text";
    const url = "https://example.com/graphql?format=invalid";
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      url,
      headers: new Headers([["Content-Type", "application/graphql+json"]]),
      text: jest.fn(
        () =>
          new Promise((resolve) => {
            resolve(bodyText);
          }),
      ),
    };
    let error: any;

    try {
      await handleFetchResponse(response as any);
    } catch (e) {
      error = e;
    }

    expect(error.name).toBe("ParseError");
    expect(error.message).toMatch(
      /Failed to parse JSON response \(url=https:\/\/example\.com\/graphql, status=200, contentType=application\/graphql\+json, bodyLength=8, cause=SyntaxError: Unexpected token/,
    );
    expect(error.statusCode).toBe(200);
    expect(error.requestUrl).toBe("https://example.com/graphql");
    expect(error.contentType).toBe("application/graphql+json");
    expect(error.bodyLength).toBe(bodyText.length);
    expect(response.text).toHaveBeenCalledTimes(1);
    expect(response.text).toHaveBeenCalledWith();
  });

  test("normal response", async () => {
    const response = {
      ok: true,
      status: 200,
      headers: new Headers([["Content-Type", "application/graphql+json"]]),
      text: jest.fn(
        () =>
          new Promise((resolve) => {
            resolve(`{"data": { "info": true } }`);
          }),
      ),
    };
    const data = await handleFetchResponse(response as any);

    expect(data).toEqual({ data: { info: true } });
    expect(response.text).toHaveBeenCalledTimes(1);
    expect(response.text).toHaveBeenCalledWith();
  });

  test("partial response", async () => {
    const response = {
      ok: true,
      status: 200,
      headers: new Headers([["Content-Type", "application/json"]]),
      text: jest.fn(
        () =>
          new Promise((resolve) => {
            resolve(
              `{"data": { "info": true }, "errors": [{ "message": "Test error" }] }`,
            );
          }),
      ),
    };
    let result: any;
    let error: any;

    try {
      result = await handleFetchResponse(response as any);
    } catch (e) {
      error = e;
    }

    expect(error).toBeUndefined();
    expect(result).toEqual({
      data: { info: true },
      errors: [{ message: "Test error" }],
    });
    expect(response.text).toHaveBeenCalledTimes(1);
    expect(response.text).toHaveBeenCalledWith();
  });

  // TODO: Is this really a query error?
  test("formatted error response", async () => {
    const response = {
      ok: false,
      status: 400,
      headers: new Headers([["Content-Type", "application/json"]]),
      text: jest.fn(
        () =>
          new Promise((resolve) => {
            resolve(
              `{ "errors": [{ "message": "Something went bad parsing query", "extensions": { "code": "graphql" } }] }`,
            );
          }),
      ),
    };
    let result: any;
    let error: any;

    try {
      result = await handleFetchResponse(response as any);
    } catch (e) {
      error = e;
    }
    expect(error).toBeUndefined();
    expect(result).toEqual({
      errors: [
        {
          message: "Something went bad parsing query",
          extensions: {
            code: "graphql",
          },
        },
      ],
    });

    expect(response.text).toHaveBeenCalledTimes(1);
    expect(response.text).toHaveBeenCalledWith();
  });
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
    () =>
      new Promise((resolve) => {
        resolve({ data: { info } });
      }),
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
  const result = runGroup(runQuery as RunOperation, group);

  expect(result instanceof Promise).toBe(true);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(runQuery.mock.calls).toMatchSnapshot();

  await result;

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
  const runQuery = jest.fn(
    () =>
      new Promise((_, reject) => {
        reject(error);
      }),
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
  const result = runGroup(runQuery as RunOperation, group);

  expect(result instanceof Promise).toBe(true);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);
  expect(runQuery.mock.calls).toMatchSnapshot();

  await result;

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
    () =>
      new Promise((resolve) => {
        resolve({ data: { info, info_1: info2 } });
      }),
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
  const result = runGroup(runQuery as RunOperation, group);

  expect(result instanceof Promise).toBe(true);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);
  expect(runQuery.mock.calls).toMatchSnapshot();

  await result;

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
      new Promise((resolve) => {
        resolve({
          errors: [error1],
          data: {
            info,
          },
        });
      }),
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
  const result = runGroup(runQuery as RunOperation, group);

  expect(result instanceof Promise).toBe(true);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);
  expect(runQuery.mock.calls).toMatchSnapshot();

  await result;

  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve).toHaveBeenCalledWith({ info: { name: "info" } });
  expect(resolve.mock.calls[0]![0]!.info).toBe(info);
  const splitError = reject2.mock.calls[0]![0] as QueryError;

  expect(splitError.name).toBe("QueryError");
  expect(splitError.errors).toEqual([error1]);
  expect(splitError.queryData).toEqual({ info: undefined });
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
      new Promise((resolve) => {
        resolve({
          errors: [error0, error1, error2],
          data: {
            info,
            info_1: info2,
          },
        });
      }),
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
  const result = runGroup(runQuery as RunOperation, group);

  expect(result instanceof Promise).toBe(true);
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(reject).toHaveBeenCalledTimes(0);
  expect(resolve2).toHaveBeenCalledTimes(0);
  expect(reject2).toHaveBeenCalledTimes(0);
  expect(runQuery.mock.calls).toMatchSnapshot();

  await result;

  const firstError = reject.mock.calls[0]![0] as QueryError;
  const secondError = reject2.mock.calls[0]![0] as QueryError;

  expect(firstError.name).toBe("QueryError");
  expect(firstError.errors).toEqual([error0, error2]);
  expect(firstError.queryData).toEqual({ info });
  expect(resolve).toHaveBeenCalledTimes(0);
  expect(secondError.name).toBe("QueryError");
  expect(secondError.errors).toEqual([error1, error2]);
  expect(secondError.queryData).toEqual({ info: info2 });
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

  await result;

  expect(resolve).toHaveBeenCalledTimes(0);
  const rejectedError = reject.mock.calls[0]![0] as QueryError;

  expect(rejectedError.name).toBe("QueryError");
  expect(rejectedError.errors).toEqual([error1]);
  expect(rejectedError.queryData).toEqual({});
});
