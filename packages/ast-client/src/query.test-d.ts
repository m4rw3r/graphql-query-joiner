// File testing types
//
// See https://tstyche.org/

import type {
  EmptyObject,
  Mutation,
  Operation,
  OperationParameters,
  OperationResult,
  Query,
} from "./query";
import type { Client } from "./client";
import type { DocumentNode } from "graphql/language";
import { describe, expect, test } from "tstyche";

interface MyQueryParams {
  path: string;
}

interface MyQueryResult {
  id: number;
  content: string;
}

// Dummy client
const runQuery: Client = <O extends Operation<any, any>>(
  _query: O,
  _params?: OperationParameters<O> | EmptyObject,
): Promise<OperationResult<O>> => ({}) as Promise<OperationResult<O>>;

const myQuery = {} as Query<MyQueryParams, MyQueryResult>;
const voidQuery = {} as Query<void, MyQueryResult>;
const undefinedQuery = {} as Query<undefined, MyQueryResult>;
const emptyQuery = {} as Query<EmptyObject, MyQueryResult>;
const emptyRecordQuery = {} as Query<Record<string, never>, MyQueryResult>;

// TODO: Query vs Mutation vs Operation

describe("Queries", () => {
  test("are not plain document nodes", () => {
    expect(myQuery).type.not.toEqual<DocumentNode>();
    expect(voidQuery).type.not.toEqual<DocumentNode>();
    expect(undefinedQuery).type.not.toEqual<DocumentNode>();
    expect(emptyQuery).type.not.toEqual<DocumentNode>();
    expect(emptyRecordQuery).type.not.toEqual<DocumentNode>();
  });

  test("All queries are DocumentNodes", () => {
    expect<DocumentNode>().type.toBeAssignable(myQuery);
    expect<DocumentNode>().type.toBeAssignable(voidQuery);
    expect<DocumentNode>().type.toBeAssignable(undefinedQuery);
    expect<DocumentNode>().type.toBeAssignable(emptyQuery);
    expect<DocumentNode>().type.toBeAssignable(emptyRecordQuery);
  });

  test("But DocumentNodes are not queries", () => {
    expect(myQuery).type.not.toBeAssignable<DocumentNode>();
    expect(voidQuery).type.not.toBeAssignable<DocumentNode>();
    expect(undefinedQuery).type.not.toBeAssignable<DocumentNode>();
    expect(emptyQuery).type.not.toBeAssignable<DocumentNode>();
    expect(emptyRecordQuery).type.not.toBeAssignable<DocumentNode>();
  });

  test("are not Mutations", () => {
    expect(myQuery).type.not.toBeAssignable<Mutation<any, any>>();
    expect(voidQuery).type.not.toBeAssignable<Mutation<any, any>>();
    expect(undefinedQuery).type.not.toBeAssignable<Mutation<any, any>>();
    expect(emptyQuery).type.not.toBeAssignable<Mutation<any, any>>();
    expect(emptyRecordQuery).type.not.toBeAssignable<Mutation<any, any>>();
  });
});

// prettier-ignore
describe("Client", () => {
  test("If the Query has a non-empty parameter object, the variables parameter is required", () => {
    expect(runQuery(myQuery, { path: "foo" })).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(myQuery)).type.toRaiseError(2554); // "Expected 2 arguments, but got 1."
  });

  test("If the query does not require any parameters, we can skip them", () => {
    expect(runQuery(voidQuery, undefined)).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(voidQuery)).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(undefinedQuery, undefined)).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(undefinedQuery)).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(emptyQuery)).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(emptyQuery, {})).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(emptyRecordQuery)).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(emptyRecordQuery, {})).type.toEqual<Promise<MyQueryResult>>();
  });

  test("Empty parameters also accept undefined or empty object", () => {
    expect(runQuery(voidQuery, undefined)).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(voidQuery, {})).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(undefinedQuery, undefined)).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(undefinedQuery, {})).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(emptyQuery, undefined)).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(emptyQuery, {})).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(emptyRecordQuery, undefined)).type.toEqual<Promise<MyQueryResult>>();
    expect(runQuery(emptyRecordQuery, {})).type.toEqual<Promise<MyQueryResult>>();
  });

  // TODO: Should it though? This could cause issues later when using
  test("Extra parameter should raise error on Query<void, _>", () => {
    expect(runQuery(voidQuery, { test: "foo" })).type.toRaiseError(2322); // "Type string is not assignable to never."
  });

  test("Extra parameter should raise error on Query<undefined, _>", () => {
    expect(runQuery(undefinedQuery, { test: "foo" })).type.toRaiseError(2322); // "Type string is not assignable to never."
  });

  test("Extra parameter should raise error on Query<EmptyObject, _>", () => {
    expect(runQuery(emptyQuery, { test: "foo" })).type.toRaiseError(2322); // "Type string is not assignable to never."
  });

  test("Extra parameter should raise error on Query<Record<string, never>, _>", () => {
    expect(runQuery(emptyRecordQuery, { test: "foo" })).type.toRaiseError(2322); // "Type string is not assignable to never."
  });
});

describe("OperationResult", () => {
  test("OperationResult should resolve to the type of the result", () => {
    expect<OperationResult<typeof myQuery>>().type.toEqual<MyQueryResult>;
    expect<OperationResult<typeof voidQuery>>().type.toEqual<MyQueryResult>;
    expect<OperationResult<typeof undefinedQuery>>().type
      .toEqual<MyQueryResult>;
    expect<OperationResult<typeof emptyQuery>>().type.toEqual<MyQueryResult>;
    expect<OperationResult<typeof emptyRecordQuery>>().type
      .toEqual<MyQueryResult>;
  });
});

describe("OperationParameters", () => {
  test("OperationParameters should resolve to the type of the parameters", () => {
    expect<OperationParameters<typeof myQuery>>().type.toEqual<MyQueryParams>;
    expect<OperationParameters<typeof voidQuery>>().type.toEqual<void>;
    expect<OperationParameters<typeof undefinedQuery>>().type
      .toEqual<undefined>;
    expect<OperationParameters<typeof emptyQuery>>().type.toEqual<EmptyObject>;
    expect<OperationParameters<typeof emptyRecordQuery>>().type
      .toEqual<EmptyObject>;
  });
});
