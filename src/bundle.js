/* @flow */

import type {
  ASTNode,
  DocumentNode,
  DefinitionNode,
  SelectionNode,
  OperationDefinitionNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  OperationTypeNode,
  VariableDefinitionNode,
  VariableNode,
} from "graphql/language";
import type { Query } from "./query";

import { Kind, print, visit } from "graphql/language";

export type QueryBundle = {
  +operation: OperationTypeNode,
  +variables: $ReadOnlyMap<string, VariableDefinitionNode>,
  // Map is used to preserve order of fields
  +fields: $ReadOnlyMap<string, FieldNode>,
  +fragments: $ReadOnlyMap<string, FragmentDefinitionNode>,
};

export type MergedQueryBundle = {
  +bundle: QueryBundle,
  // Map of old name -> new name
  +renamedFields: { +[key: string]: string },
  // Map of old name -> new name
  +renamedVariables: { +[key: string]: string },
};

export const createBundle = (query: Query<any, any>): QueryBundle => {
  const variables = new Map();
  const fields = new Map();
  const fragments = new Map();
  let operation = null;

  const operationVisitor = {
    VariableDefinition(definition: VariableDefinitionNode): void {
      variables.set(definition.variable.name.value, definition);
    },
    OperationDefinition(node: OperationDefinitionNode): void {
      node.selectionSet.selections.forEach((sel: SelectionNode): void => {
        if (sel.kind !== Kind.FIELD) {
          throw new Error(
            `Non-field selection found in root operation in query '${print(query)}'.`
          );
        }

        fields.set(sel.alias ? sel.alias.value : sel.name.value, sel);
      });
    },
  };

  // Fragments have problems with parameter names, especially if they are
  // reused or occur in front of the query/mutation, see
  // https://github.com/graphql/graphql-spec/issues/204#issuecomment-241879256
  // and the heading "Always Globals, Always defined (this is what GraphQL
  // today does)".
  //
  // So we rename all fragments and variables in the operation first, then
  // we rename fragment names and variables.
  query.definitions.forEach((node: DefinitionNode): void => {
    switch (node.kind) {
      case Kind.FRAGMENT_DEFINITION:
        fragments.set(node.name.value, node);

        break;

      case Kind.OPERATION_DEFINITION:
        if (operation) {
          throw new Error(
            `Query cannot contain more than one executable operation in query '${print(query)}'.`
          );
        }

        operation = visit(node, operationVisitor);

        break;

      default:
        throw new Error(`Non-executable definition found in query '${print(query)}'.`);
    }
  });

  if (!operation) {
    throw new Error(`Executable operation is missing in query '${print(query)}'.`);
  }

  return {
    fields,
    fragments,
    operation: operation.operation,
    variables,
  };
};

export const mergeQuery = (
  bundle: QueryBundle,
  query: Query<any, any>
): MergedQueryBundle => mergeBundle(bundle, createBundle(query));

export const mergeBundle = (
  bundle: QueryBundle,
  newBundle: QueryBundle
): MergedQueryBundle => {
  const operation = bundle.operation;
  const variables = new Map(bundle.variables);
  const fields = new Map(bundle.fields);
  const fragments = new Map(bundle.fragments);

  if (operation !== newBundle.operation) {
    throw new Error(
      `Query operation type '${newBundle.operation}' mismatch with bundle operation type '${operation}'.`
    );
  }

  // Most of these might be order-sensitive
  const renamedFragments = rename(fragments, newBundle.fragments);
  const renamedFields = rename(fields, newBundle.fields);
  const renamedVariables = rename(variables, newBundle.variables);

  const renameReferences = <T: ASTNode>(node: T): T => visit(node, {
    FragmentSpread(spread: FragmentSpreadNode): ?FragmentSpreadNode {
      const { name: { value } } = spread;

      const newName = renamedFragments[value] || value;

      if (newName !== value) {
        // Only create a new fragment spread if we actually need to rename it
        return {
          ...spread,
          name: {
            kind: Kind.NAME,
            value: newName,
          },
        };
      }

      // Do not modify
    },
    Variable(variable: VariableNode): ?VariableNode {
      const { name: { value } } = variable;

      const newName = renamedVariables[value] || value;

      if (newName !== value) {
        // Only create a new variable spread if we actually need to rename it
        return {
          ...variable,
          name: {
            kind: Kind.NAME,
            value: newName,
          },
        };
      }

      // Do not modify
    },
  });

  // Rename self and references while assigning to merged bundle
  newBundle.fields.forEach((field: FieldNode, name: string): void => {
    const newName = renamedFields[name] || name;

    if (newName !== name) {
      field = {
        ...field,
        alias: {
          kind: Kind.NAME,
          value: newName,
        },
      };
    }

    fields.set(newName, renameReferences(field));
  });
  newBundle.fragments.forEach((fragment: FragmentDefinitionNode, name: string): void => {
    const newName = renamedFragments[name] || name;

    if (newName !== name) {
      fragment = {
        ...fragment,
        name: {
          kind: Kind.NAME,
          value: newName,
        },
      };
    }

    fragments.set(newName, renameReferences(fragment));
  });
  newBundle.variables.forEach((node: VariableDefinitionNode, name: string): void => {
    const newName = renamedVariables[name] || name;

    if (newName !== name) {
      node = {
        ...node,
        variable: {
          ...node.variable,
          name: {
            kind: Kind.NAME,
            value: newName,
          },
        },
      };
    }

    variables.set(newName, renameReferences(node));
  });

  return {
    bundle: {
      fields,
      fragments,
      operation,
      variables,
    },
    renamedVariables,
    renamedFields,
  };
};

export const createDocument = ({
  fragments,
  operation,
  fields,
  variables,
}: QueryBundle): DocumentNode => {
  const definitions = [{
    kind: Kind.OPERATION_DEFINITION,
    operation,
    variableDefinitions: Array.from(variables.values()),
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: Array.from(fields.values()),
    },
  }];

  fragments.forEach((fragment: FragmentDefinitionNode): void => {
    definitions.push(fragment);
  });

  return {
    kind: Kind.DOCUMENT,
    definitions,
  };
};

/**
 * Returns a map of old name -> new name for the supplied maps, if the name is
 * not colliding it will not be renamed but will still be included in the
 * result.
 */
const rename = <T>(
  oldItems: $ReadOnlyMap<string, T>,
  newItems: $ReadOnlyMap<string, T>
): { [key: string]: string } => {
  const newNames = {};

  newItems.forEach((object: T, name: string): void => {
    let i = 0;
    let newName = name;

    while (oldItems.has(newName)) {
      newName = name + `_${++i}`;
    }

    newNames[name] = newName;
  });

  return newNames;
};
