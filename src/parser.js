/* @flow */

import type {
  ASTNode,
  DocumentNode,
  DefinitionNode,
  FragmentDefinitionNode,
  FieldNode,
  FragmentSpreadNode,
  OperationDefinitionNode,
  OperationTypeNode,
  SelectionNode,
  VariableDefinitionNode,
  VariableNode,
} from "graphql/language";

import { Kind, print, visit } from "graphql/language";

export type AliasMap = { [newAlias: string]: string };
export type FragmentMap = { [fragmentName: string]: FragmentDefinitionNode };
export type VariableMap = { [parameterName: string]: VariableDefinitionNode };

/**
 * Verifies the document has the correct operation type and parameters.
 */
export const verifyDocument = (
  doc: DocumentNode,
  operation: OperationTypeNode,
  parameters: {}
): void => {
  visit(doc, {
    VariableDefinition({ variable: { name: { value } } }: VariableDefinitionNode): void {
      if (Object.prototype.hasOwnProperty.call(parameters, value)) {
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

export const extractOperationVariablesAndRootFields = (
  doc: DocumentNode,
  operation: OperationDefinitionNode,
  prefix: string
): {
  operation: OperationDefinitionNode,
  rootFields: AliasMap,
  variableDefinitions: VariableMap,
} => {
  const rootFields: AliasMap = {};
  const variableDefinitions: VariableMap = {};

  operation = visit(operation, {
    VariableDefinition(definition: VariableDefinitionNode): void {
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
    OperationDefinition(node: OperationDefinitionNode): OperationDefinitionNode {
      return {
        ...node,
        selectionSet: {
          ...node.selectionSet,
          selections: node.selectionSet.selections.map(
            (sel: SelectionNode): FieldNode => {
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
            }
          ),
        },
      };
    },
  });

  return {
    operation,
    rootFields,
    variableDefinitions,
  };
};

export const renameVariablesAndFragments = <T: ASTNode>(
  doc: DocumentNode,
  node: T,
  variables: VariableMap,
  fragments: FragmentMap
): T => {
  return visit(node, {
    FragmentSpread(spread: FragmentSpreadNode): FragmentSpreadNode {
      const { name: { value } } = spread;

      if (!fragments[value]) {
        throw new Error(`Definition of fragment '${value}' is missing in query '${print(doc)}'.`);
      }

      return {
        ...spread,
        name: {
          kind: Kind.NAME,
          value: fragments[value].name.value,
        },
      };
    },
    Variable(variable: VariableNode): VariableNode {
      const { name: { value } } = variable;

      if (!variables[value]) {
        throw new Error(`Definition of variable '${value}' is missing in query '${print(doc)}'.`);
      }

      return {
        ...variable,
        name: {
          kind: Kind.NAME,
          value: variables[value].variable.name.value,
        },
      };
    },
  });
};

/**
 * Extracts all executable definitions and their variable parameters and
 * definitions.
 */
export const extractDefinitionVariablesAndRootFields = (doc: DocumentNode, prefix: string): {
  operation: OperationDefinitionNode,
  fragments: Array<FragmentDefinitionNode>,
  rootFields: AliasMap,
  variableDefinitions: VariableMap,
} => {
  let selectedOperation: ?OperationDefinitionNode = null;
  const fragments: FragmentMap = {};

  // Fragments have problems with parameter names, especially if they are
  // reused or occur in front of the query/mutation, see
  // https://github.com/graphql/graphql-spec/issues/204#issuecomment-241879256
  // and the heading "Always Globals, Always defined (this is what GraphQL
  // today does)".
  //
  // So we rename all fragments first, then we parse the operation to determine
  // variable names and rename fragment names, then we do the same for the
  // fragments:
  doc.definitions.forEach((node: DefinitionNode): void => {
    switch (node.kind) {
      case Kind.FRAGMENT_DEFINITION:
        fragments[node.name.value] = {
          ...node,
          name: {
            kind: Kind.NAME,
            value: prefix + "f" + Object.keys(fragments).length,
          },
        };

        break;

      case Kind.OPERATION_DEFINITION:
        if (selectedOperation) {
          throw new Error(`Query cannot contain more than one executable operation in query '${print(doc)}'.`);
        }

        selectedOperation = node;

        break;

      default:
        throw new Error(`Non-executable definition found in query '${print(doc)}'.`);
    }
  });

  if (!selectedOperation) {
    throw new Error(`Executable operation is missing in query '${print(doc)}.`);
  }

  const {
    operation,
    rootFields,
    variableDefinitions,
  } = extractOperationVariablesAndRootFields(doc, selectedOperation, prefix);

  return {
    operation: renameVariablesAndFragments(doc, operation, variableDefinitions, fragments),
    fragments: ((Object.values(fragments): any): Array<FragmentDefinitionNode>)
      .map((frag: FragmentDefinitionNode): FragmentDefinitionNode =>
        renameVariablesAndFragments(doc, frag, variableDefinitions, fragments)),
    rootFields,
    variableDefinitions,
  };
};
