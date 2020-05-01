/* @flow */

import type {
  DocumentNode,
  FieldNode,
  OperationTypeNode,
  FragmentDefinitionNode,
  VariableDefinitionNode,
} from "graphql/language";

import { Kind, print } from "graphql/language";
import { extractDefinitionVariablesAndRootFields } from "./parser";

// eslint-disable-next-line no-unused-vars
export type Query<P: {}, R> = DocumentNode;

export type TypeOfQueryParameters<+Q: Query<any, any>> = $Call<<T, Q: Query<any, T>>(Q) => T, Q>;

export type Request = {
  +operation: OperationTypeNode,
  +fields: $ReadOnlyArray<FieldNode>,
  // List of renamed fragments for this selection
  +fragments: $ReadOnlyArray<FragmentDefinitionNode>,
  // Map from new alias to old alias
  +aliases: Map<string, string>,
  +variables: Map<string, VariableDefinitionNode>,
  // Actual parameters supplied to this request
  // TODO: Maybe move to a separate part not concerned with the rest?
  +parameters: { [k: string]: mixed },
};

export const createRequest = <Q: Query<any, any>>(
  prefix: string,
  query: Q,
  parameters: TypeOfQueryParameters<Q>
): Request => {
  const {
    fields,
    fragments,
    operation,
    aliases,
    variables,
  } = extractDefinitionVariablesAndRootFields(query, prefix);

  for (const k of variables.keys()) {
    if (!Object.prototype.hasOwnProperty.call(parameters, k)) {
      throw new Error(`Missing parameter '${k}' in call to '${print(query)}'.`);
    }
  }

  for (const k in parameters) {
    if (Object.prototype.hasOwnProperty.call(parameters, k)) {
      if (!variables.has(k)) {
        throw new Error(`Extra parameter '${k}' supplied to query '${print(query)}'.`);
      }
    }
  }

  return {
    operation,
    fields,
    fragments,
    // Aliases are unique
    aliases,
    // TODO: Rename variables to not conflict on join
    variables,
    // TODO: Rename parameters to not conflict on join
    parameters,
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
  let operation: ?OperationTypeNode = null;

  const aliases: Map<string, string> = new Map();
  const variables: Map<string, VariableDefinitionNode> = new Map();

  for (const r of requests) {
    // TODO: Verify?
    operation = r.operation;

    for (const [k, v] of r.variables) {
      variables.set(k, v);
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
    parameters: Object.assign({}, ...requests.map(({ parameters }: Request): {} => parameters)),
  };
};

