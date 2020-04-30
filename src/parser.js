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

export type AliasMap = { [newAlias:string]: string };
export type VariableMap = { [parameterName:string]: VariableDefinitionNode };

/**
 * Verifies the document has the correct operation type and parameters.
 */
export const verifyDocument = (doc: DocumentNode, operation: OperationTypeNode, parameters: {}): void => {
  doc.definitions.forEach(({ kind }): void => {
    if(kind !== Kind.FRAGMENT_DEFINITION || kind !== Kind.OPERATION_DEFINITION) {
      throw new Error(`Non-executable definition found in query '${print(doc)}'.`);
    }
  });

  visit(doc, {
    VariableDefinition({ variable: { name: { value } } }): void {
      if (!parameters.hasOwnProperty(value)) {
        throw new Error(`Missing parameter '${value}' in call to '${print(doc)}'.`);
      }
    },
    OperationDefinition(node: OperationDefinitionNode): void {
      if (node.operation !== operation) {
        throw new Error(`Batch-operation type '${operation}' does not match operation type '${node.operation}' in query '${print(doc)}'.`);
      }
    },
  });
};

/**
 * Extracts all executable definitions and their variable parameters and definitions.
 */
export const extractDefinitionVariablesAndRootFields = (doc: DocumentNode, prefix: string): {
  definitions: Array<ExecutableDefinitionNode>,
  rootFields: AliasMap,
  variableDefinitions: VariableMap,
} => {
  // FIXME: Fragments have problems with parameter names, especially if they
  // are reused or occur in front of the query/mutation, see
  // https://github.com/graphql/graphql-spec/issues/204#issuecomment-241879256
  // and the heading "Always Globals, Always defined (this is what GraphQL today does)".
  const definitions: Array<ExecutableDefinitionNode> = [];
  const rootFields: AliasMap = {};
  const variableDefinitions: VariableMap = {};

  visit(doc, {
    VariableDefinition(definition): void {
      variableDefinitions[definition.variable.name.value] = {
        ...definition,
        variable: {
          ...definition.variable,
          name: {
            kind: Kind.NAME,
            value: prefix + "v" + Object.keys(variableDefinitions).length,
          },
        },
      };
    },
    Variable(variable): VariableNode {
      const { name: { value } } = variable

      if( ! variableDefinitions[value]) {
        throw new Error(`Definition of variable '${value}' is missing in query '${print(doc)}'.`);
      }

      return {
        ...variable,
        name: {
          kind: Kind.NAME,
          value: variableDefinitions[value].variable.name.value,
        },
      };
    },
    FragmentDefinition: {
      leave(node: FragmentDefinitionNode): void {
        definitions.push(node);
      },
    },
    OperationDefinition: {
      enter(node: OperationDefinitionNode): OperationDefinitionNode {
        return {
          ...node,
          selectionSet: {
            ...node.selectionSet,
            selections: node.selectionSet.selections.map(sel => {
              if (sel.kind !== Kind.FIELD) {
                throw new Error(`Non-field selection found in root operation in query '${print(doc)}'.`);
              }

              const name = sel.alias ? sel.alias.value : sel.name.value;
              const alias = {
                kind: Kind.NAME,
                value: prefix + "a" + Object.keys(rootFields).length,
              };

              rootFields[alias.value] = name;

              return {
                ...sel,
                alias,
              };
            }),
          },
        };
      },
      leave(node: OperationDefinitionNode): void {
        definitions.push(node);
      },
    }
  });

  return {
    definitions,
    rootFields,
    variableDefinitions,
  };
};
