/* @flow */

import type {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  OperationTypeNode,
  VariableDefinitionNode,
} from "graphql/language";

import type { Query, Request, TypeOfQueryParameters } from "./query";

import { print } from "graphql/language";
import { createDocument, createRequest, joinRequests } from "./query";

type Batch = {
  operation: OperationTypeNode,
  requests: Array<Request>,
};

export const createBatch = (operation: OperationTypeNode): Batch => ({
  operation,
  requests: [],
});

// TODO: Return promise
export const addQuery = <Q: Query<any, any>>(
  batch: Batch,
  query: Q,
  parameters: TypeOfQueryParameters<Q> = {}
): void => {
  const prefix = "_" + batch.requests.length + "_";
  const request = createRequest(prefix, query, parameters);

  if (request.operation !== batch.operation) {
    throw new Error(`Query operation type '${request.operation}' mismatch with batch operation type '${batch.operation}'.`);
  }

  batch.requests.push(request);
};

export const stringify = ({ requests }: Batch): string => {
  return print(createDocument(joinRequests(requests)));
};
