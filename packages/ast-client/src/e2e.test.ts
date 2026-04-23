// TODO: Write full e2e tests with some basic cases

import type { Query, GraphQLResponse, QueryError } from "./index";

import { parse } from "graphql/language";
import { createClient, handleFetchResponse } from "./index";

describe("Client", () => {
  test("Basic response", async () => {
    const runOperation = jest.fn<Promise<GraphQLResponse<any>>, []>(() =>
      handleFetchResponse({
        ok: true,
        type: "basic",
        status: 200,
        statusText: "OK",
        headers: new Headers([["Content-Type", "application/json"]]),
        text: jest.fn(
          () =>
            new Promise((resolve) => {
              resolve(`{"data": { "info": true, "moreData": "testing" } }`);
            }),
        ),
      } as unknown as Response),
    );

    const client = createClient({
      runOperation,
      debounce: 0,
    });

    const query = parse(`query { info, moreData }`) as Query<
      void,
      { info: string; moreData: string }
    >;
    let result: { info: string } | undefined;
    let error: QueryError | undefined;

    try {
      result = await client(query);
    } catch (e) {
      error = e as QueryError;
    }

    expect(error).toBeUndefined();
    expect(result).toEqual({ info: true, moreData: "testing" });
  });

  test("Basic response with a single error", async () => {
    const runOperation = jest.fn<Promise<GraphQLResponse<any>>, []>(() =>
      handleFetchResponse({
        ok: true,
        type: "basic",
        status: 200,
        statusText: "OK",
        url: "https://example.com/graphql?operation=query",
        headers: new Headers([["Content-Type", "application/json"]]),
        text: jest.fn(
          () =>
            new Promise((resolve) => {
              resolve(
                `{"data": { "info": null, "moreData": "testing" }, "errors": [{ "message": "Test error", "path": ["info"] }] }`,
              );
            }),
        ),
      } as unknown as Response),
    );

    const client = createClient({
      runOperation,
      debounce: 0,
    });

    const query = parse(`query { info, moreData }`) as Query<
      void,
      { info: string; moreData: string }
    >;
    let result: { info: string } | undefined;
    let error: any;

    try {
      result = await client(query);
    } catch (e) {
      error = e;
    }

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("QueryError");
    expect(error.message).toMatch(
      /GraphQL errors \(errorCount=1, first="Test error", path=info\)/,
    );
    expect(error.errors).toEqual([{ message: "Test error", path: ["info"] }]);
    expect(error.queryData).toEqual({ info: null, moreData: "testing" });
  });

  test("Malformed JSON response", async () => {
    const bodyText = `{ "error": true, "message": "Something went wrong" }`;
    const runOperation = jest.fn<Promise<GraphQLResponse<any>>, []>(() =>
      handleFetchResponse({
        ok: true,
        type: "basic",
        status: 200,
        statusText: "OK",
        url: "https://example.com/graphql?response=invalid",
        headers: new Headers([["Content-Type", "application/json"]]),
        text: jest.fn(
          () =>
            new Promise((resolve) => {
              resolve(bodyText);
            }),
        ),
      } as unknown as Response),
    );

    const client = createClient({
      runOperation,
      debounce: 0,
    });

    const query = parse(`query { info, moreData }`) as Query<
      void,
      { info: string; moreData: string }
    >;
    let result: { info: string } | undefined;
    let error: any;

    try {
      result = await client(query);
    } catch (e) {
      error = e;
    }

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("RequestError");
    expect(error.message).toBe(
      `Received unexpected JSON body content (url=https://example.com/graphql, status=200, contentType=application/json, bodyLength=${bodyText.length})`,
    );
    expect(error.statusCode).toEqual(200);
    expect(error.requestUrl).toBe("https://example.com/graphql");
    expect(error.contentType).toBe("application/json");
    expect(error.bodyLength).toBe(bodyText.length);
  });

  test("Body interrupted", async () => {
    const bodyError = new Error("Failed to read body");
    const runOperation = jest.fn<Promise<GraphQLResponse<any>>, []>(() =>
      handleFetchResponse({
        ok: true,
        type: "basic",
        status: 200,
        statusText: "OK",
        headers: new Headers([
          ["Content-Type", "application/graphql-response+json"],
        ]),
        text: jest.fn(
          () =>
            new Promise((_, reject) => {
              reject(bodyError);
            }),
        ),
      } as unknown as Response),
    );

    const client = createClient({
      runOperation,
      debounce: 0,
    });

    const query = parse(`query { info, moreData }`) as Query<
      Record<string, never>,
      { info: string; moreData: string }
    >;
    let result: { info: string } | undefined;
    let error: any;

    try {
      result = await client(query);
    } catch (e) {
      error = e;
    }

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
    expect(error).toBe(bodyError);
  });
});
