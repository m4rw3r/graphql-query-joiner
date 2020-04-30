/* @flow */

import type {
  DefinitionNode,
  DocumentNode,
  ExecutableDefinitionNode,
  FieldNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  OperationTypeNode,
  SelectionSetNode,
  VariableDefinitionNode,
  VariableNode,
} from "graphql/language";

import { Kind, print, visit } from "graphql/language";

import { verifyDocument, extractDefinitionVariablesAndRootFields } from "./parser";

type Batch = {
  aliasMap: { [newAlias:string]: { operationId: number, name: string } },
  fragments: Array<FragmentDefinitionNode>,
  operation: OperationTypeNode,
  operations: Array<OperationDefinitionNode>,
  parameters: { [k:string]: mixed },
  variables: { [k:string]: VariableDefinitionNode },
};

type Query<P: {}, R> = DocumentNode;

type TypeofQueryParametrers<+Q: Query<any, any>> = $Call<<T, Q: Query<any, T>>(Q) => T, Q>;

export const createBatch = (operation: OperationTypeNode): Batch => ({
  aliasMap: {},
  definitions: [],
  fragments: [],
  operation,
  operations: [],
  parameters: {},
  variables: {},
});

// TODO: Return promise
export const addQuery = <Q: Query<any, any>>(
  batch: Batch,
  query: Q,
  parameters: TypeofQueryParametrers<Q> = {}
) => {
  // Try to reuse fragments? Parameters might be problematic
  verifyDocument(query, batch.operation, parameters);

  const { operation, fragments, rootFields, variableDefinitions } = extractDefinitionVariablesAndRootFields(query, "_" + batch.operations.length + "_");

  // We have to validate all before we assign to avoid having the Batch end up
  // in an inconsistent state
  for (const k in parameters) {
    if (!variableDefinitions[k]) {
      throw new Error(`Extra parameter '${k}' supplied to query '${print(query)}'.`);
    }
  }

  for (const k in parameters) {
    const def = variableDefinitions[k];

    if(def) {
      batch.parameters[def.variable.name.value] = parameters[k];
    }
  }

  for (const k in variableDefinitions) {
    const def = variableDefinitions[k];

    batch.variables[def.variable.name.value] = def;
  }

  for (const k in rootFields) {
    batch.aliasMap[k] = {
      operationId: batch.operations.length,
      name: rootFields[k],
    };
  }

  batch.operations.push(operation);
  batch.fragments = batch.fragments.concat(fragments);
};

export const stringify = ({ fragments, operation, operations, variables }: Batch): string => {
  // We have filtered these already, so it is safe to consider them FieldNodes
  const selections: Array<FieldNode> = [].concat.call([], ...operations.map(({ selectionSet }) => selectionSet.selections));

  const doc: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: [{
      kind: Kind.OPERATION_DEFINITION,
      operation,
      // $FlowFixMe
      variableDefinitions: Object.values(variables),
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections,
      },
    }].concat(fragments),
  };

  return print(doc);
};

export const getRequestBody = (batch: Batch) => {
};