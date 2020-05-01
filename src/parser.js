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

export type AliasMap = Map<string, string>;
export type FragmentMap = Map<string, FragmentDefinitionNode>;
export type VariableMap = Map<string, VariableDefinitionNode>;

export const extractOperationVariablesAndRootFields = (
  doc: DocumentNode,
  operation: OperationDefinitionNode,
  prefix: string
): {
  operation: OperationTypeNode,
  fields: Array<FieldNode>,
  aliases: AliasMap,
  variables: VariableMap,
} => {
  const aliases: AliasMap = new Map();
  const fields: Array<FieldNode> = [];
  const variables: VariableMap = new Map();

  operation = visit(operation, {
    VariableDefinition(definition: VariableDefinitionNode): void {
      variables.set(definition.variable.name.value, {
        ...definition,
        variable: {
          ...definition.variable,
          name: {
            kind: Kind.NAME,
            value: prefix + "v" + variables.size,
          },
        },
      });
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
              const field = {
                ...sel,
                alias: {
                  kind: Kind.NAME,
                  value: prefix + "a" + aliases.size,
                },
              };

              aliases.set(field.alias.value, name);
              fields.push(field);

              return field;
            }
          ),
        },
      };
    },
  });

  return {
    operation: operation.operation,
    fields,
    aliases,
    variables,
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
      const fragment = fragments.get(value);

      if (!fragment) {
        throw new Error(`Definition of fragment '${value}' is missing in query '${print(doc)}'.`);
      }

      return {
        ...spread,
        name: {
          kind: Kind.NAME,
          value: fragment.name.value,
        },
      };
    },
    Variable(variable: VariableNode): VariableNode {
      const { name: { value } } = variable;
      const renamed = variables.get(value);

      if (!renamed) {
        throw new Error(`Definition of variable '${value}' is missing in query '${print(doc)}'.`);
      }

      return {
        ...variable,
        name: {
          kind: Kind.NAME,
          value: renamed.variable.name.value,
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
  operation: OperationTypeNode,
  fields: Array<FieldNode>,
  fragments: Array<FragmentDefinitionNode>,
  aliases: AliasMap,
  variables: VariableMap,
} => {
  let selectedOperation: ?OperationDefinitionNode = null;
  const fragments: FragmentMap = new Map();

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
        fragments.set(node.name.value, {
          ...node,
          name: {
            kind: Kind.NAME,
            value: prefix + "f" + Object.keys(fragments).length,
          },
        });

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
    fields,
    aliases,
    variables,
  } = extractOperationVariablesAndRootFields(doc, selectedOperation, prefix);

  return {
    operation,
    fields: fields.map((field: FieldNode): FieldNode =>
      renameVariablesAndFragments(doc, field, variables, fragments)),
    fragments: Array.from(
      fragments.values(),
      (frag: FragmentDefinitionNode): FragmentDefinitionNode =>
        renameVariablesAndFragments(doc, frag, variables, fragments)
    ),
    aliases,
    variables,
  };
};
