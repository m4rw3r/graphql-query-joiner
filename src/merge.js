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
  +fields: $ReadOnlyMap<string, FieldNode>,
  +fragments: $ReadOnlyMap<string, FragmentDefinitionNode>,
};

export type MergedQueryBundle = {
  bundle: QueryBundle,
  renamedFields: { [oldName: string]: string },
  renamedVariables: { [oldName: string]: string },
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
    throw new Error(`Executable operation is missing in query '${print(query)}.`);
  }

  return {
    fields,
    fragments,
    operation: operation.operation,
    variables,
  };
};

export const mergeQueries = (bundle: QueryBundle, query: Query<any, any>): MergedQueryBundle => {
  const operation = bundle.operation;
  const variables = new Map(bundle.variables);
  const fields = new Map(bundle.fields);
  const fragments = new Map(bundle.fragments);
  const newBundle = createBundle(query);
  const renamedFragments = {};
  const renamedFields = {};
  const renamedVariables = {};

  if (operation !== newBundle.operation) {
    throw new Error(
      `Query operation type '${newBundle.operation}' mismatch with bundle operation type '${operation}'.`
    );
  }

  newBundle.fields.forEach(createNamer(fields, renamedFields));
  newBundle.fragments.forEach(createNamer(fragments, renamedFragments));
  newBundle.variables.forEach(createNamer(variables, renamedVariables));

  const renameReferences = <T: ASTNode>(node: T): T => visit(node, {
    FragmentSpread(spread: FragmentSpreadNode): ?FragmentSpreadNode {
      const { name: { value } } = spread;

      if (renamedFragments[value]) {
        return {
          ...spread,
          name: {
            kind: Kind.NAME,
            value: renamedFragments[value],
          },
        };
      }

      // Do not modify
    },
    Variable(variable: VariableNode): ?VariableNode {
      const { name: { value } } = variable;

      if (renamedVariables[value]) {
        return {
          ...variable,
          name: {
            kind: Kind.NAME,
            value: renamedVariables[value],
          },
        };
      }

      // Do not modify
    },
  });

  // Rename self and references while assigning to merged bundle
  newBundle.fields.forEach((field: FieldNode, name: string): void => {
    if (renamedFields[name]) {
      field = {
        ...field,
        alias: {
          kind: Kind.NAME,
          value: renamedFields[name],
        },
      };
    }

    fields.set(renamedFields[name] || name, renameReferences(field));
  });
  newBundle.fragments.forEach((fragment: FragmentDefinitionNode, name: string): void => {
    if (renamedFragments[name]) {
      fragment = {
        ...fragment,
        name: {
          kind: Kind.NAME,
          value: renamedFragments[name],
        },
      };
    }

    fragments.set(renamedFragments[name] || name, renameVariablesAndFragments(fragment));
  });
  newBundle.variables.forEach((node: VariableDefinitionNode, name: string): void => {
    if (renamedVariables[name]) {
      node = {
        ...node,
        variable: {
          ...node.variable,
          name: {
            kind: Kind.NAME,
            value: renamedVariables[name],
          },
        },
      };
    }

    variables.set(renamedVariables[name] || name, renameReferences(node));
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
 * Creates a function which renames conflicting keys in `existing`, storing
 * the new names in the `nameMap`.
 */
const createNamer = <T>(
  existing: Map<string, T>,
  nameMap: { [original: string]: string }
): ((T, string) => void) =>
    (object: T, name: string): void => {
      let i = 0;
      let newName = name;

      while (existing.has(newName)) {
        i++;
        newName = name + (i > 0 ? `_${i}` : "");
      }

      if (i > 0) {
        nameMap[name] = newName;
      }
    };
