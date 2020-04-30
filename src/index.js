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

type Batch = {
  aliasCount: number,
  aliasMap: { [newAlias:string]: { operationId: number, name: string } },
  definitions: Array<ExecutableDefinitionNode>,
  parameters: { [k:string]: mixed },
  operation: OperationTypeNode,
  variableCount: number,
  variables: { [k:string]: VariableDefinitionNode },
};

type Query<P: {}, R> = string;

type TypeofQueryParametrers<+Q: Query<any, any>> = $Call<<T, Q: Query<any, T>>(Q) => T, Q>;

export const createBatch = (operation: OperationTypeNode): Batch => ({
  aliasCount: 0,
  aliasMap: {},
  definitions: [],
  parameters: {},
  operation,
  variableCount: 0,
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
  // New alias -> old alias
  const aliases: { [k:string]: string } = {};
  const varDefs: { [k:string]: VariableDefinitionNode } = {};

  const doc: DocumentNode = visit(document, {
    VariableDefinition(definition): void {
      const { variable } = definition;
      const { name } = variable;

      if (!parameters.hasOwnProperty(name.value)) {
        throw new Error(`Missing parameter '${name.value}' in call to '${query}'.`);
      }

      varDefs[definition.variable.name.value] = {
        ...definition,
        variable: {
          ...variable,
          name: {
            kind: Kind.NAME,
            value: `__v${++batch.variableCount}`,
          },
        },
      };
    },
    Variable(variable): VariableNode {
      const { name: { value } } = variable

      if( ! varDefs[value]) {
        throw new Error(`Definition of variable '${value}' is missing in query '${query}'.`);
      }

      return {
        ...variable,
        name: {
          kind: Kind.NAME,
          value: varDefs[value].variable.name.value,
        },
      };
    },
    OperationDefinition(node: OperationDefinitionNode): OperationDefinitionNode {
      if (node.operation !== batch.operation) {
        throw new Error(`Batch-operation type '${batch.operation}' does not match operation type '${node.operation}' in query '${query}'.`);
      }

      return {
        ...node,
        selectionSet: {
          ...node.selectionSet,
          selections: node.selectionSet.selections.map(sel => {
            if (sel.kind !== Kind.FIELD) {
              throw new Error(`Non-field selection found in root operation in query '${query}'.`);
            }

            const name = sel.alias ? sel.alias.value : sel.name.value;
            const alias = {
              kind: Kind.NAME,
              value: `__a${++batch.aliasCount}`,
            };

            aliases[alias.value] = name;

            return {
              ...sel,
              alias,
            };
          }),
        },
      };
    }
  });

  for (const k in parameters) {
    const def = varDefs[k];

    if(def) {
      batch.parameters[def.variable.name.value] = parameters[k];
    }
    else {
      throw new Error(`Extra parameter '${k}' supplied to query '${query}'.`);
    }
  }

  for (const k in varDefs) {
    const def = varDefs[k];

    batch.variables[def.variable.name.value] = def;
  }

  batch.definitions = doc.definitions.reduce((defs, node) => {
    switch (node.kind) {
      case Kind.OPERATION_DEFINITION:
        for (const k in aliases) {
          batch.aliasMap[k] = {
            operationId: defs.length,
            name: aliases[k],
          };
        }

        // Fallthrough
      case Kind.FRAGMENT_DEFINITION:
        defs.push(node);

        break;

      default:
        throw new Error(`Non-executable definition node found in '${query}'.`);
    }

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
}