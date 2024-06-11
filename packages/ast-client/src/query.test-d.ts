// File testing types
//
// See https://tstyche.org/

import type { EmptyObject, Mutation, Query } from "./query";
import type { Client } from "./client";
import type { DocumentNode } from "graphql/language";
import type {
  ResultOf,
  TypedDocumentNode,
  VariablesOf,
} from "@graphql-typed-document-node/core";

import { describe, expect, test } from "tstyche";

interface MyQueryParams {
  path: string;
}

interface MyQueryResult {
  id: number;
  content: string;
}

// Dummy client
const runQuery: Client = <O extends TypedDocumentNode<any, any>>(
  _query: O,
  _params?: VariablesOf<O> | EmptyObject,
): Promise<ResultOf<O>> => ({}) as Promise<ResultOf<O>>;

const myQuery = {} as Query<MyQueryParams, MyQueryResult>;
const voidQuery = {} as Query<void, MyQueryResult>;
const undefinedQuery = {} as Query<undefined, MyQueryResult>;
const emptyQuery = {} as Query<EmptyObject, MyQueryResult>;
const emptyRecordQuery = {} as Query<Record<string, never>, MyQueryResult>;

// TODO: Query vs Mutation vs Operation

describe("Queries", () => {
  test("are not plain document nodes", () => {
    expect(myQuery).type.not.toBe<DocumentNode>();
    expect(voidQuery).type.not.toBe<DocumentNode>();
    expect(undefinedQuery).type.not.toBe<DocumentNode>();
    expect(emptyQuery).type.not.toBe<DocumentNode>();
    expect(emptyRecordQuery).type.not.toBe<DocumentNode>();
  });

  test("All queries are DocumentNodes", () => {
    expect(myQuery).type.toBeAssignableTo<DocumentNode>();
    expect(voidQuery).type.toBeAssignableTo<DocumentNode>();
    expect(undefinedQuery).type.toBeAssignableTo<DocumentNode>();
    expect(emptyQuery).type.toBeAssignableTo<DocumentNode>();
    expect(emptyRecordQuery).type.toBeAssignableTo<DocumentNode>();
  });

  test("But DocumentNodes are not queries", () => {
    expect(myQuery).type.not.toBeAssignableWith<DocumentNode>();
    expect(voidQuery).type.not.toBeAssignableWith<DocumentNode>();
    expect(undefinedQuery).type.not.toBeAssignableWith<DocumentNode>();
    expect(emptyQuery).type.not.toBeAssignableWith<DocumentNode>();
    expect(emptyRecordQuery).type.not.toBeAssignableWith<DocumentNode>();
  });

  test("are not Mutations", () => {
    expect(myQuery).type.not.toBeAssignableWith<Mutation<any, any>>();
    expect(voidQuery).type.not.toBeAssignableWith<Mutation<any, any>>();
    expect(undefinedQuery).type.not.toBeAssignableWith<Mutation<any, any>>();
    expect(emptyQuery).type.not.toBeAssignableWith<Mutation<any, any>>();
    expect(emptyRecordQuery).type.not.toBeAssignableWith<Mutation<any, any>>();
  });
});

// prettier-ignore
describe("Client", () => {
  test("If the Query has a non-empty parameter object, the variables parameter is required", () => {
    expect(runQuery(myQuery, { path: "foo" })).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(myQuery)).type.toRaiseError(2554); // "Expected 2 arguments, but got 1."
  });

  test("If the query does not require any parameters, we can skip them", () => {
    expect(runQuery(voidQuery, undefined)).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(voidQuery)).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(undefinedQuery, undefined)).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(undefinedQuery)).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(emptyQuery)).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(emptyQuery, {})).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(emptyRecordQuery)).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(emptyRecordQuery, {})).type.toBe<Promise<MyQueryResult>>();
  });

  test("Empty parameters also accept undefined or empty object", () => {
    expect(runQuery(voidQuery, undefined)).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(voidQuery, {})).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(undefinedQuery, undefined)).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(undefinedQuery, {})).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(emptyQuery, undefined)).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(emptyQuery, {})).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(emptyRecordQuery, undefined)).type.toBe<Promise<MyQueryResult>>();
    expect(runQuery(emptyRecordQuery, {})).type.toBe<Promise<MyQueryResult>>();
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

describe("ResultOf", () => {
  test("ResultOf should resolve to the type of the result", () => {
    expect<ResultOf<typeof myQuery>>().type.toBe<MyQueryResult>;
    expect<ResultOf<typeof voidQuery>>().type.toBe<MyQueryResult>;
    expect<ResultOf<typeof undefinedQuery>>().type.toBe<MyQueryResult>;
    expect<ResultOf<typeof emptyQuery>>().type.toBe<MyQueryResult>;
    expect<ResultOf<typeof emptyRecordQuery>>().type.toBe<MyQueryResult>;
  });
});

describe("VariablesOf", () => {
  test("VariablesOf should resolve to the type of the parameters", () => {
    expect<VariablesOf<typeof myQuery>>().type.toBe<MyQueryParams>;
    expect<VariablesOf<typeof voidQuery>>().type.toBe<void>;
    expect<VariablesOf<typeof undefinedQuery>>().type.toBe<undefined>;
    expect<VariablesOf<typeof emptyQuery>>().type.toBe<EmptyObject>;
    expect<VariablesOf<typeof emptyRecordQuery>>().type.toBe<EmptyObject>;
  });
});
