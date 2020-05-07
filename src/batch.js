/* @flow */

import type { OperationTypeNode } from "graphql/language";

import type { Query, TypeOfQueryParameters } from "./query";
import type { Request } from "./request";

import { print } from "graphql/language";
import { createDocument, createRequest, joinRequests } from "./request";

type Entry = {
  request: Request,
  // Renamed parameters
  parameters: { [k: string]: mixed },
};

export type Batch = {
  operation: OperationTypeNode,
  entries: Array<Entry>,
};

const entryRequest = ({ request }: Entry): Request => request;

export const createBatch = (operation: OperationTypeNode): Batch => ({
  operation,
  entries: [],
});

// TODO: Return promise
export const addQuery = <Q: Query<any, any>>(
  batch: Batch,
  query: Q,
  parameters: TypeOfQueryParameters<Q> = {}
): void => {
  const prefix = "_" + batch.entries.length + "_";
  const request = createRequest(prefix, query);

  if (request.operation !== batch.operation) {
    throw new Error(
      `Query operation type '${request.operation}' mismatch with batch operation type '${batch.operation}'.`
    );
  }

  batch.entries.push({
    request,
    parameters: renameParameters(request, parameters, query),
  });
};

export const stringify = ({ entries }: Batch): string => {
  return print(createDocument(joinRequests(entries.map(entryRequest))));
};

export const renameParameters = <P: {}, R, Q: Query<P, R>>(
  { variables }: Request,
  parameters: P,
  query: Q
): { [k: string]: mixed } => {
  const renamed = {};

  for (const [k, v] of variables) {
    if (Object.prototype.hasOwnProperty.call(parameters, k)) {
      // Rename to match the variables
      renamed[v.variable.name.value] = parameters[k];
    }
    else {
      throw new Error(`Missing parameter '${k}' in call to '${print(query)}'.`);
    }
  }

  for (const k in parameters) {
    if (Object.prototype.hasOwnProperty.call(parameters, k)) {
      if (!variables.has(k)) {
        throw new Error(`Extra parameter '${k}' supplied to query '${print(query)}'.`);
      }
    }
  }

  return renamed;
};
