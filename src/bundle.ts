import type { Query, RenameMap } from "./query";
import type {
  ASTNode,
  DocumentNode,
  DefinitionNode,
  OperationTypeNode,
  OperationDefinitionNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  VariableDefinitionNode,
  VariableNode,
} from "graphql/language";

// Importing print here for debugging purposes is no problem since we need it
// to be able to assemble the query
import { Kind, print, visit } from "graphql/language";

export type QueryBundle = {
  readonly operation: OperationTypeNode;
  readonly variables: ReadonlyMap<string, VariableDefinitionNode>;
  // Map is used to preserve order of fields
  readonly fields: ReadonlyMap<string, FieldNode>;
  readonly fragments: ReadonlyMap<string, FragmentDefinitionNode>;
};

export type MergedQueryBundle = {
  readonly bundle: QueryBundle;
  // Map of old name -> new name
  readonly renamedFields: Readonly<RenameMap>;
  // Map of old name -> new name
  readonly renamedVariables: Readonly<RenameMap>;
};

export const createBundle = <P, R>(query: Query<P, R>): QueryBundle => {
  const variables = new Map();
  const fields = new Map();
  const fragments = new Map();
  let operation: OperationDefinitionNode | undefined = undefined;

  const operationVisitor = {
    VariableDefinition(definition: VariableDefinitionNode): void {
      variables.set(definition.variable.name.value, definition);
    },

    OperationDefinition(node: OperationDefinitionNode): void {
      for (const sel of node.selectionSet.selections) {
        if (sel.kind !== Kind.FIELD) {
          throw new Error(
            `Non-field selection found in root operation in query '${print(query)}'.`,
          );
        }

        fields.set(sel.alias ? sel.alias.value : sel.name.value, sel);
      }
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
  for (const node of query.definitions) {
    switch (node.kind) {
      case Kind.FRAGMENT_DEFINITION:
        fragments.set(node.name.value, node);
        break;

      case Kind.OPERATION_DEFINITION:
        if (operation) {
          throw new Error(
            `Query cannot contain more than one executable operation in query '${print(query)}'.`,
          );
        }

        operation = visit(node, operationVisitor);
        break;

      default:
        throw new Error(
          `Non-executable definition found in query '${print(query)}'.`,
        );
    }
  }

  if (!operation) {
    throw new Error(
      `Executable operation is missing in query '${print(query)}'.`,
    );
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
  query: Query<unknown, unknown>,
): MergedQueryBundle => mergeBundle(bundle, createBundle(query));

export const mergeBundle = (
  bundle: QueryBundle,
  newBundle: QueryBundle,
): MergedQueryBundle => {
  const operation = bundle.operation;
  const variables = new Map(bundle.variables);
  const fields = new Map(bundle.fields);
  const fragments = new Map(bundle.fragments);

  if (operation !== newBundle.operation) {
    throw new Error(
      `Query operation type '${newBundle.operation}' mismatch with bundle operation type '${operation}'.`,
    );
  }

  // Most of these might be order-sensitive
  const renamedFragments = rename(fragments, newBundle.fragments);
  const renamedFields = rename(fields, newBundle.fields);
  const renamedVariables = rename(variables, newBundle.variables);

  const renameReferences = <T extends ASTNode>(node: T): T =>
    visit(node, {
      FragmentSpread(
        spread: FragmentSpreadNode,
      ): FragmentSpreadNode | null | undefined {
        const name = spread.name.value;
        const newName = renamedFragments[name] || name;

        if (newName !== name) {
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
        return undefined;
      },

      Variable(variable: VariableNode): VariableNode | null | undefined {
        const name = variable.name.value;
        const newName = renamedVariables[name] || name;

        if (newName !== name) {
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
        return undefined;
      },
    });

  // Rename self and references while assigning to merged bundle
  for (const [name, field] of newBundle.fields) {
    const newName = renamedFields[name] || name;
    const ref = renameReferences(
      newName === name
        ? field
        : {
            ...field,
            alias: {
              kind: Kind.NAME,
              value: newName,
            },
          },
    );

    fields.set(newName, ref);
  }

  for (const [name, fragment] of newBundle.fragments) {
    const newName = renamedFragments[name] || name;
    const ref = renameReferences(
      newName === name
        ? fragment
        : {
            ...fragment,
            name: {
              kind: Kind.NAME,
              value: newName,
            },
          },
    );
    fragments.set(newName, ref);
  }

  for (const [name, node] of newBundle.variables) {
    const newName = renamedVariables[name] || name;
    const ref = renameReferences(
      newName === name
        ? node
        : {
            ...node,
            variable: {
              ...node.variable,
              name: {
                kind: Kind.NAME,
                value: newName,
              },
            },
          },
    );

    variables.set(newName, ref);
  }

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
  const definitions: Array<DefinitionNode> = [
    {
      kind: Kind.OPERATION_DEFINITION,
      operation,
      variableDefinitions: Array.from(variables.values()),
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: Array.from(fields.values()),
      },
    },
  ];

  for (const fragment of fragments.values()) {
    definitions.push(fragment);
  }

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
  oldItems: ReadonlyMap<string, T>,
  newItems: ReadonlyMap<string, T>,
): Record<string, string> => {
  const newNames: Record<string, string> = {};

  for (const [name] of newItems) {
    let i = 0;
    let newName = name;

    while (oldItems.has(newName)) {
      newName = name + `_${++i}`;
    }

    newNames[name] = newName;
  }

  return newNames;
};
