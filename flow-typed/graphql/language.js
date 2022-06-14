/** @flow */
declare module "graphql/language" {

/**
 * Converts an AST into a string, using one set of reasonable
 * formatting rules.
 */
declare function print(ast: ASTNode): string;

/**
 * Configuration options to control parser behavior
 */
declare type ParseOptions = {|
  /**
   * By default, the parser creates AST nodes that know the location
   * in the source that they correspond to. This configuration flag
   * disables that behavior for performance or testing.
   */
  noLocation?: boolean,

  /**
   * If enabled, the parser will parse empty fields sets in the Schema
   * Definition Language. Otherwise, the parser will follow the current
   * specification.
   *
   * This option is provided to ease adoption of the final SDL specification
   * and will be removed in v16.
   */
  allowLegacySDLEmptyFields?: boolean,

  /**
   * If enabled, the parser will parse implemented interfaces with no `&`
   * character between each interface. Otherwise, the parser will follow the
   * current specification.
   *
   * This option is provided to ease adoption of the final SDL specification
   * and will be removed in v16.
   */
  allowLegacySDLImplementsInterfaces?: boolean,

  /**
   * EXPERIMENTAL:
   *
   * If enabled, the parser will understand and parse variable definitions
   * contained in a fragment definition. They'll be represented in the
   * `variableDefinitions` field of the FragmentDefinitionNode.
   *
   * The syntax is identical to normal, query-defined variables. For example:
   *
   *   fragment A($var: Boolean = false) on T  {
   *     ...
   *   }
   *
   * Note: this feature is experimental and may change or be removed in the
   * future.
   */
  experimentalFragmentVariables?: boolean,
|};

/**
 * Given a GraphQL source, parses it into a Document.
 * Throws GraphQLError if a syntax error is encountered.
 */
declare function parse(
  source: string,
  options?: ParseOptions,
): DocumentNode;


declare var Kind: {|
  // Name
  +NAME: 'Name',

  // Document
  +DOCUMENT: 'Document',
  +OPERATION_DEFINITION: 'OperationDefinition',
  +VARIABLE_DEFINITION: 'VariableDefinition',
  +SELECTION_SET: 'SelectionSet',
  +FIELD: 'Field',
  +ARGUMENT: 'Argument',

  // Fragments
  +FRAGMENT_SPREAD: 'FragmentSpread',
  +INLINE_FRAGMENT: 'InlineFragment',
  +FRAGMENT_DEFINITION: 'FragmentDefinition',

  // Values
  +VARIABLE: 'Variable',
  +INT: 'IntValue',
  +FLOAT: 'FloatValue',
  +STRING: 'StringValue',
  +BOOLEAN: 'BooleanValue',
  +NULL: 'NullValue',
  +ENUM: 'EnumValue',
  +LIST: 'ListValue',
  +OBJECT: 'ObjectValue',
  +OBJECT_FIELD: 'ObjectField',

  // Directives
  +DIRECTIVE: 'Directive',

  // Types
  +NAMED_TYPE: 'NamedType',
  +LIST_TYPE: 'ListType',
  +NON_NULL_TYPE: 'NonNullType',

  // Type System Definitions
  +SCHEMA_DEFINITION: 'SchemaDefinition',
  +OPERATION_TYPE_DEFINITION: 'OperationTypeDefinition',

  // Type Definitions
  +SCALAR_TYPE_DEFINITION: 'ScalarTypeDefinition',
  +OBJECT_TYPE_DEFINITION: 'ObjectTypeDefinition',
  +FIELD_DEFINITION: 'FieldDefinition',
  +INPUT_VALUE_DEFINITION: 'InputValueDefinition',
  +INTERFACE_TYPE_DEFINITION: 'InterfaceTypeDefinition',
  +UNION_TYPE_DEFINITION: 'UnionTypeDefinition',
  +ENUM_TYPE_DEFINITION: 'EnumTypeDefinition',
  +ENUM_VALUE_DEFINITION: 'EnumValueDefinition',
  +INPUT_OBJECT_TYPE_DEFINITION: 'InputObjectTypeDefinition',

  // Directive Definitions
  +DIRECTIVE_DEFINITION: 'DirectiveDefinition',

  // Type System Extensions
  +SCHEMA_EXTENSION: 'SchemaExtension',

  // Type Extensions
  +SCALAR_TYPE_EXTENSION: 'ScalarTypeExtension',
  +OBJECT_TYPE_EXTENSION: 'ObjectTypeExtension',
  +INTERFACE_TYPE_EXTENSION: 'InterfaceTypeExtension',
  +UNION_TYPE_EXTENSION: 'UnionTypeExtension',
  +ENUM_TYPE_EXTENSION: 'EnumTypeExtension',
  +INPUT_OBJECT_TYPE_EXTENSION: 'InputObjectTypeExtension',
|};

declare type Visitor<KindToNode, Nodes = $Values<KindToNode>> =
  | EnterLeave<
      | VisitFn<Nodes>
      | ShapeMap<KindToNode, <Node>(Node) => VisitFn<Nodes, Node>>,
    >
  | ShapeMap<
      KindToNode,
      <Node>(Node) => VisitFn<Nodes, Node> | EnterLeave<VisitFn<Nodes, Node>>,
    >;
declare type EnterLeave<T> = {| +enter?: T, +leave?: T |};
declare type ShapeMap<O, F> = $Shape<$ObjMap<O, F>>;

/**
 * A visitor is comprised of visit functions, which are called on each node
 * during the visitor's traversal.
 */
declare type VisitFn<TAnyNode, TVisitedNode: TAnyNode = TAnyNode> = (
  // The current node being visiting.
  node: TVisitedNode,
  // The index or key to this node from the parent node or Array.
  key: string | number | void,
  // The parent immediately above this node, which may be an Array.
  parent: TAnyNode | $ReadOnlyArray<TAnyNode> | void,
  // The key path to get to this node from the root node.
  path: $ReadOnlyArray<string | number>,
  // All nodes and Arrays visited before reaching parent of this node.
  // These correspond to array indices in `path`.
  // Note: ancestors includes arrays which contain the parent of visited node.
  ancestors: $ReadOnlyArray<TAnyNode | $ReadOnlyArray<TAnyNode>>,
) => any;

/**
 * A KeyMap describes each the traversable properties of each kind of node.
 */
declare type VisitorKeyMap<KindToNode> = $ObjMap<
  KindToNode,
  <T>(T) => $ReadOnlyArray<$Keys<T>>,
>;

declare function visit(
  root: ASTNode,
  visitor: Visitor<ASTKindToNode>,
): any;

/**
 * The list of all possible AST node types.
 */
declare type ASTNode =
  | NameNode
  | DocumentNode
  | OperationDefinitionNode
  | VariableDefinitionNode
  | VariableNode
  | SelectionSetNode
  | FieldNode
  | ArgumentNode
  | FragmentSpreadNode
  | InlineFragmentNode
  | FragmentDefinitionNode
  | IntValueNode
  | FloatValueNode
  | StringValueNode
  | BooleanValueNode
  | NullValueNode
  | EnumValueNode
  | ListValueNode
  | ObjectValueNode
  | ObjectFieldNode
  | DirectiveNode
  | NamedTypeNode
  | ListTypeNode
  | NonNullTypeNode
  | SchemaDefinitionNode
  | OperationTypeDefinitionNode
  | ScalarTypeDefinitionNode
  | ObjectTypeDefinitionNode
  | FieldDefinitionNode
  | InputValueDefinitionNode
  | InterfaceTypeDefinitionNode
  | UnionTypeDefinitionNode
  | EnumTypeDefinitionNode
  | EnumValueDefinitionNode
  | InputObjectTypeDefinitionNode
  | DirectiveDefinitionNode
  | SchemaExtensionNode
  | ScalarTypeExtensionNode
  | ObjectTypeExtensionNode
  | InterfaceTypeExtensionNode
  | UnionTypeExtensionNode
  | EnumTypeExtensionNode
  | InputObjectTypeExtensionNode;

/**
 * Utility type listing all nodes indexed by their kind.
 */
declare type ASTKindToNode = {|
  Name: NameNode,
  Document: DocumentNode,
  OperationDefinition: OperationDefinitionNode,
  VariableDefinition: VariableDefinitionNode,
  Variable: VariableNode,
  SelectionSet: SelectionSetNode,
  Field: FieldNode,
  Argument: ArgumentNode,
  FragmentSpread: FragmentSpreadNode,
  InlineFragment: InlineFragmentNode,
  FragmentDefinition: FragmentDefinitionNode,
  IntValue: IntValueNode,
  FloatValue: FloatValueNode,
  StringValue: StringValueNode,
  BooleanValue: BooleanValueNode,
  NullValue: NullValueNode,
  EnumValue: EnumValueNode,
  ListValue: ListValueNode,
  ObjectValue: ObjectValueNode,
  ObjectField: ObjectFieldNode,
  Directive: DirectiveNode,
  NamedType: NamedTypeNode,
  ListType: ListTypeNode,
  NonNullType: NonNullTypeNode,
  SchemaDefinition: SchemaDefinitionNode,
  OperationTypeDefinition: OperationTypeDefinitionNode,
  ScalarTypeDefinition: ScalarTypeDefinitionNode,
  ObjectTypeDefinition: ObjectTypeDefinitionNode,
  FieldDefinition: FieldDefinitionNode,
  InputValueDefinition: InputValueDefinitionNode,
  InterfaceTypeDefinition: InterfaceTypeDefinitionNode,
  UnionTypeDefinition: UnionTypeDefinitionNode,
  EnumTypeDefinition: EnumTypeDefinitionNode,
  EnumValueDefinition: EnumValueDefinitionNode,
  InputObjectTypeDefinition: InputObjectTypeDefinitionNode,
  DirectiveDefinition: DirectiveDefinitionNode,
  SchemaExtension: SchemaExtensionNode,
  ScalarTypeExtension: ScalarTypeExtensionNode,
  ObjectTypeExtension: ObjectTypeExtensionNode,
  InterfaceTypeExtension: InterfaceTypeExtensionNode,
  UnionTypeExtension: UnionTypeExtensionNode,
  EnumTypeExtension: EnumTypeExtensionNode,
  InputObjectTypeExtension: InputObjectTypeExtensionNode,
|};

// Name

declare type NameNode = {|
  +kind: 'Name',
  +loc?: Location,
  +value: string,
|};

// Document

declare type DocumentNode = {|
  +kind: 'Document',
  +loc?: Location,
  +definitions: $ReadOnlyArray<DefinitionNode>,
|};

declare type DefinitionNode =
  | ExecutableDefinitionNode
  | TypeSystemDefinitionNode
  | TypeSystemExtensionNode;

declare type ExecutableDefinitionNode =
  | OperationDefinitionNode
  | FragmentDefinitionNode;

declare type OperationDefinitionNode = {|
  +kind: 'OperationDefinition',
  +loc?: Location,
  +operation: OperationTypeNode,
  +name?: NameNode,
  +variableDefinitions?: $ReadOnlyArray<VariableDefinitionNode>,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +selectionSet: SelectionSetNode,
|};

declare type OperationTypeNode = 'query' | 'mutation' | 'subscription';

declare type VariableDefinitionNode = {|
  +kind: 'VariableDefinition',
  +loc?: Location,
  +variable: VariableNode,
  +type: TypeNode,
  +defaultValue?: ValueNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
|};

declare type VariableNode = {|
  +kind: 'Variable',
  +loc?: Location,
  +name: NameNode,
|};

declare type SelectionSetNode = {|
  kind: 'SelectionSet',
  loc?: Location,
  selections: $ReadOnlyArray<SelectionNode>,
|};

declare type SelectionNode = FieldNode | FragmentSpreadNode | InlineFragmentNode;

declare type FieldNode = {|
  +kind: 'Field',
  +loc?: Location,
  +alias?: NameNode,
  +name: NameNode,
  +arguments?: $ReadOnlyArray<ArgumentNode>,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +selectionSet?: SelectionSetNode,
|};

declare type ArgumentNode = {|
  +kind: 'Argument',
  +loc?: Location,
  +name: NameNode,
  +value: ValueNode,
|};

// Fragments

declare type FragmentSpreadNode = {|
  +kind: 'FragmentSpread',
  +loc?: Location,
  +name: NameNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
|};

declare type InlineFragmentNode = {|
  +kind: 'InlineFragment',
  +loc?: Location,
  +typeCondition?: NamedTypeNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +selectionSet: SelectionSetNode,
|};

declare type FragmentDefinitionNode = {|
  +kind: 'FragmentDefinition',
  +loc?: Location,
  +name: NameNode,
  // Note: fragment variable definitions are experimental and may be changed
  // or removed in the future.
  +variableDefinitions?: $ReadOnlyArray<VariableDefinitionNode>,
  +typeCondition: NamedTypeNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +selectionSet: SelectionSetNode,
|};

// Values

declare type ValueNode =
  | VariableNode
  | IntValueNode
  | FloatValueNode
  | StringValueNode
  | BooleanValueNode
  | NullValueNode
  | EnumValueNode
  | ListValueNode
  | ObjectValueNode;

declare type IntValueNode = {|
  +kind: 'IntValue',
  +loc?: Location,
  +value: string,
|};

declare type FloatValueNode = {|
  +kind: 'FloatValue',
  +loc?: Location,
  +value: string,
|};

declare type StringValueNode = {|
  +kind: 'StringValue',
  +loc?: Location,
  +value: string,
  +block?: boolean,
|};

declare type BooleanValueNode = {|
  +kind: 'BooleanValue',
  +loc?: Location,
  +value: boolean,
|};

declare type NullValueNode = {|
  +kind: 'NullValue',
  +loc?: Location,
|};

declare type EnumValueNode = {|
  +kind: 'EnumValue',
  +loc?: Location,
  +value: string,
|};

declare type ListValueNode = {|
  +kind: 'ListValue',
  +loc?: Location,
  +values: $ReadOnlyArray<ValueNode>,
|};

declare type ObjectValueNode = {|
  +kind: 'ObjectValue',
  +loc?: Location,
  +fields: $ReadOnlyArray<ObjectFieldNode>,
|};

declare type ObjectFieldNode = {|
  +kind: 'ObjectField',
  +loc?: Location,
  +name: NameNode,
  +value: ValueNode,
|};

// Directives

declare type DirectiveNode = {|
  +kind: 'Directive',
  +loc?: Location,
  +name: NameNode,
  +arguments?: $ReadOnlyArray<ArgumentNode>,
|};

// Type Reference

declare type TypeNode = NamedTypeNode | ListTypeNode | NonNullTypeNode;

declare type NamedTypeNode = {|
  +kind: 'NamedType',
  +loc?: Location,
  +name: NameNode,
|};

declare type ListTypeNode = {|
  +kind: 'ListType',
  +loc?: Location,
  +type: TypeNode,
|};

declare type NonNullTypeNode = {|
  +kind: 'NonNullType',
  +loc?: Location,
  +type: NamedTypeNode | ListTypeNode,
|};

// Type System Definition

declare type TypeSystemDefinitionNode =
  | SchemaDefinitionNode
  | TypeDefinitionNode
  | DirectiveDefinitionNode;

declare type SchemaDefinitionNode = {|
  +kind: 'SchemaDefinition',
  +loc?: Location,
  +description?: StringValueNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +operationTypes: $ReadOnlyArray<OperationTypeDefinitionNode>,
|};

declare type OperationTypeDefinitionNode = {|
  +kind: 'OperationTypeDefinition',
  +loc?: Location,
  +operation: OperationTypeNode,
  +type: NamedTypeNode,
|};

// Type Definition

declare type TypeDefinitionNode =
  | ScalarTypeDefinitionNode
  | ObjectTypeDefinitionNode
  | InterfaceTypeDefinitionNode
  | UnionTypeDefinitionNode
  | EnumTypeDefinitionNode
  | InputObjectTypeDefinitionNode;

declare type ScalarTypeDefinitionNode = {|
  +kind: 'ScalarTypeDefinition',
  +loc?: Location,
  +description?: StringValueNode,
  +name: NameNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
|};

declare type ObjectTypeDefinitionNode = {|
  +kind: 'ObjectTypeDefinition',
  +loc?: Location,
  +description?: StringValueNode,
  +name: NameNode,
  +interfaces?: $ReadOnlyArray<NamedTypeNode>,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +fields?: $ReadOnlyArray<FieldDefinitionNode>,
|};

declare type FieldDefinitionNode = {|
  +kind: 'FieldDefinition',
  +loc?: Location,
  +description?: StringValueNode,
  +name: NameNode,
  +arguments?: $ReadOnlyArray<InputValueDefinitionNode>,
  +type: TypeNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
|};

declare type InputValueDefinitionNode = {|
  +kind: 'InputValueDefinition',
  +loc?: Location,
  +description?: StringValueNode,
  +name: NameNode,
  +type: TypeNode,
  +defaultValue?: ValueNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
|};

declare type InterfaceTypeDefinitionNode = {|
  +kind: 'InterfaceTypeDefinition',
  +loc?: Location,
  +description?: StringValueNode,
  +name: NameNode,
  +interfaces?: $ReadOnlyArray<NamedTypeNode>,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +fields?: $ReadOnlyArray<FieldDefinitionNode>,
|};

declare type UnionTypeDefinitionNode = {|
  +kind: 'UnionTypeDefinition',
  +loc?: Location,
  +description?: StringValueNode,
  +name: NameNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +types?: $ReadOnlyArray<NamedTypeNode>,
|};

declare type EnumTypeDefinitionNode = {|
  +kind: 'EnumTypeDefinition',
  +loc?: Location,
  +description?: StringValueNode,
  +name: NameNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +values?: $ReadOnlyArray<EnumValueDefinitionNode>,
|};

declare type EnumValueDefinitionNode = {|
  +kind: 'EnumValueDefinition',
  +loc?: Location,
  +description?: StringValueNode,
  +name: NameNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
|};

declare type InputObjectTypeDefinitionNode = {|
  +kind: 'InputObjectTypeDefinition',
  +loc?: Location,
  +description?: StringValueNode,
  +name: NameNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +fields?: $ReadOnlyArray<InputValueDefinitionNode>,
|};

// Directive Definitions

declare type DirectiveDefinitionNode = {|
  +kind: 'DirectiveDefinition',
  +loc?: Location,
  +description?: StringValueNode,
  +name: NameNode,
  +arguments?: $ReadOnlyArray<InputValueDefinitionNode>,
  +repeatable: boolean,
  +locations: $ReadOnlyArray<NameNode>,
|};

// Type System Extensions

declare type TypeSystemExtensionNode = SchemaExtensionNode | TypeExtensionNode;

declare type SchemaExtensionNode = {|
  +kind: 'SchemaExtension',
  +loc?: Location,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +operationTypes?: $ReadOnlyArray<OperationTypeDefinitionNode>,
|};

// Type Extensions

declare type TypeExtensionNode =
  | ScalarTypeExtensionNode
  | ObjectTypeExtensionNode
  | InterfaceTypeExtensionNode
  | UnionTypeExtensionNode
  | EnumTypeExtensionNode
  | InputObjectTypeExtensionNode;

declare type ScalarTypeExtensionNode = {|
  +kind: 'ScalarTypeExtension',
  +loc?: Location,
  +name: NameNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
|};

declare type ObjectTypeExtensionNode = {|
  +kind: 'ObjectTypeExtension',
  +loc?: Location,
  +name: NameNode,
  +interfaces?: $ReadOnlyArray<NamedTypeNode>,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +fields?: $ReadOnlyArray<FieldDefinitionNode>,
|};

declare type InterfaceTypeExtensionNode = {|
  +kind: 'InterfaceTypeExtension',
  +loc?: Location,
  +name: NameNode,
  +interfaces?: $ReadOnlyArray<NamedTypeNode>,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +fields?: $ReadOnlyArray<FieldDefinitionNode>,
|};

declare type UnionTypeExtensionNode = {|
  +kind: 'UnionTypeExtension',
  +loc?: Location,
  +name: NameNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +types?: $ReadOnlyArray<NamedTypeNode>,
|};

declare type EnumTypeExtensionNode = {|
  +kind: 'EnumTypeExtension',
  +loc?: Location,
  +name: NameNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +values?: $ReadOnlyArray<EnumValueDefinitionNode>,
|};

declare type InputObjectTypeExtensionNode = {|
  +kind: 'InputObjectTypeExtension',
  +loc?: Location,
  +name: NameNode,
  +directives?: $ReadOnlyArray<DirectiveNode>,
  +fields?: $ReadOnlyArray<InputValueDefinitionNode>,
|};
}
