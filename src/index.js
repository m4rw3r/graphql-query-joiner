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

import { Kind, parse, print, visit } from "graphql/language";

import { verifyDocument, extractDefinitionVariablesAndRootFields } from "./parser";

type Batch = {
  aliasMap: { [newAlias:string]: { operationId: number, name: string } },
  definitions: Array<ExecutableDefinitionNode>,
  parameters: { [k:string]: mixed },
  operation: OperationTypeNode,
  variables: { [k:string]: VariableDefinitionNode },
};

type Query<P: {}, R> = string;

type TypeofQueryParametrers<+Q: Query<any, any>> = $Call<<T, Q: Query<any, T>>(Q) => T, Q>;

export const createBatch = (operation: OperationTypeNode): Batch => ({
  aliasMap: {},
  definitions: [],
  parameters: {},
  operation,
  variables: {},
});

// TODO: Return promise
export const addQuery = <Q: Query<any, any>>(
  batch: Batch,
  query: Q,
  parameters: TypeofQueryParametrers<Q> = {}
) => {
  // TODO: Rename fragments? Try to reuse fragments?

  // TODO: Maybe use document nodes directly to avoid parsing them?
  const document: DocumentNode = parse(query);

  const { definitions, rootFields, variableDefinitions } = extractDefinitionVariablesAndRootFields(document, "_" + batch.definitions.length + "_");

  // We have to validate all before we assign to avoid having the Batch end up
  // in an inconsistent state
  for (const k in parameters) {
    if (!variableDefinitions[k]) {
      throw new Error(`Extra parameter '${k}' supplied to query '${query}'.`);
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

  batch.definitions = definitions.reduce((defs, node) => {
    if (node.kind === Kind.OPERATION_DEFINITION) {
      for (const k in rootFields) {
        batch.aliasMap[k] = {
          // TODO: Disregard fragments when mapping operations
          operationId: defs.length,
          name: rootFields[k],
        };
      }
    }

    defs.push(node);

    return defs;
  }, batch.definitions);
};

export const stringify = ({ definitions, variables }: Batch): string => {
  // $FlowFixMe
  const fragments: Array<FragmentDefinitionNode> = definitions.filter(({ kind }) => kind === Kind.FRAGMENT_DEFINITION);
  // $FlowFixMe
  const operations: Array<OperationDefinitionNode> = definitions.filter(({ kind }) => kind === Kind.OPERATION_DEFINITION);

  // We have filtered these already, so it is safe to consider them FieldNodes
  const selections: Array<FieldNode> = [].concat.call([], ...operations.map(({ selectionSet }) => selectionSet.selections));

  // TODO: Verify that there is only one kind of operation
  // FIXME: Proper type
  const operation = "query";

  // $FlowFixMe
  const variableDefinitions: Array<VariableDefinitionNode> = Object.values(variables);

  const selectionSet: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections,
  };

  const definition: DefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation,
    variableDefinitions,
    selectionSet,
  };

  const doc: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: fragments.concat([definition]),
  };

  return print(doc);
};

export const getRequestBody = (batch: Batch) => {
};