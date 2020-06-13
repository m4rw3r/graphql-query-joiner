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
import type { Query, QueryParameters, QueryResponse } from "./query";

import { Kind, print, visit } from "graphql/language";

export type AliasMap = Map<string, string>;
export type FragmentMap = Map<string, FragmentDefinitionNode>;
export type VariableMap = Map<string, VariableDefinitionNode>;

export type Request = {
  +query: Query<any, any>,
  +operation: OperationTypeNode,
  // Renamed fields
  +fields: $ReadOnlyArray<string>,
  // List of renamed fragments for this selection
  +fragments: $ReadOnlyArray<FragmentDefinitionNode>,
  // Map from new alias to old alias
  // +aliases: Map<string, string>,
  // Renamed variables, old name -> new name
  +variables: $ReadOnlyArray<string>,
};

/**
 * Creates a request by splitting a document into executable operation fields,
 * fragments, and their variables and definitions.
 */
export const createRequest = <Q: Query<any, any>>(
  prefix: string,
  query: Q
): Request => {
  let operation: ?OperationDefinitionNode = null;
  const fragments: Array<string> = new Map();
  // const aliases: AliasMap = new Map();
  const fields: Array<string> = [];
  const variables: Array<string> = [];

  const operationVisitor = {
    VariableDefinition(definition: VariableDefinitionNode): void {
      variables.push(definition.variable.name.value);

      /*variables.set(definition.variable.name.value, {
        ...definition,
        variable: {
          ...definition.variable,
          name: {
            kind: Kind.NAME,
            value: prefix + "v" + variables.size,
          },
        },
      });*/
    },
    OperationDefinition(node: OperationDefinitionNode): void {
      node.selectionSet.selections.forEach((sel: SelectionNode): void => {
        if (sel.kind !== Kind.FIELD) {
          throw new Error(
            `Non-field selection found in root operation in query '${print(query)}'.`
          );
        }

        fields.push(sel.alias ? sel.alias.value : sel.name.value);
      });
    },

    /*
      return {
        ...node,
        selectionSet: {
          ...node.selectionSet,
          selections: node.selectionSet.selections.map(
            (sel: SelectionNode): FieldNode => {
              if (sel.kind !== Kind.FIELD) {
                throw new Error(
                  `Non-field selection found in root operation in query '${print(query)}'.`
                );
              }

              const name = sel.alias ? sel.alias.value : sel.name.value;
              const field = {
                ...sel,
                alias: {
                  kind: Kind.NAME,
                  value: name, // prefix + "i" + aliases.size,
                },
              };

              // aliases.set(field.alias.value, name);
              fields.push(field);

              return field;
            }
          ),
        },
      };
    },
      */
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
        fragments.push(node.name.value);
        /*
        fragments.set(node.name.value, {
          ...node,
          name: {
            kind: Kind.NAME,
            value: prefix + "f" + Object.keys(fragments).length,
          },
        });
        */

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
    query,
    operation: operation.operation,
    fields,
    fragments,
    // aliases,
    variables,
  };
};

export const createDocument = ({
  fragments,
  operation,
  fields,
  variables,
}: Request): DocumentNode => {
  return {
    kind: Kind.DOCUMENT,
    definitions: [{
      kind: Kind.OPERATION_DEFINITION,
      operation,
      variableDefinitions: Array.from(variables.values()),
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: fields,
      },
    }].concat(fragments),
  };
};

export const joinRequests = (requests: Array<Request>): Request => {
  // TODO: Maybe do the actual renames here?
  let operation: ?OperationTypeNode = null;

  const aliases: Map<string, string> = new Map();
  const variables: Map<string, VariableDefinitionNode> = new Map();

  for (const r of requests) {
    // TODO: Verify?
    operation = r.operation;

    for (const v of r.variables.values()) {
      // TODO: Is this the correct rename?
      variables.set(v.variable.name.value, v);
    }

    for (const [k, v] of r.aliases) {
      aliases.set(k, v);
    }
  }

  if (!operation) {
    throw new Error(`Empty list of requests`);
  }

  return {
    operation,
    fields: [].concat(...requests.map(({ fields }: Request): $ReadOnlyArray<FieldNode> => fields)),
    fragments: [].concat(...requests.map(
      ({ fragments }: Request): $ReadOnlyArray<FragmentDefinitionNode> => fragments
    )),
    aliases,
    variables,
  };
};

export const renameVariablesAndFragments = <T: ASTNode>(
  query: DocumentNode,
  node: T,
  variables: VariableMap,
  fragments: FragmentMap
): T => {
  return visit(node, {
    FragmentSpread(spread: FragmentSpreadNode): FragmentSpreadNode {
      const { name: { value } } = spread;
      const fragment = fragments.get(value);

      if (!fragment) {
        throw new Error(`Definition of fragment '${value}' is missing in query '${print(query)}'.`);
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
        throw new Error(`Definition of variable '${value}' is missing in query '${print(query)}'.`);
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

