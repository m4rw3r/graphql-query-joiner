import type { CodegenConfig } from "@graphql-codegen/cli";

const typescriptGraphql = {
  // Generates a `type X = 'enumValue1' | 'another' instead of a full enum
  enumsAsTypes: true,
  // Adds an additional case which forces users of an enum to consider future
  // additions
  futureProofEnums: true,
  // Adds an additional case which forces users of an union to consider future
  // additions
  futureProofUnions: true,
  // Wrap everything in immutable
  immutableTypes: true,
  // Throw if we are missing definitions on scalar
  strictScalars: true,
  // Default scalars are any which is bad
  defaultScalarType: "unknown",
  // Skip the default __typename? definitions
  skipTypename: true,
  // Reuse types
  useTypeImports: true,
};

const config: CodegenConfig = {
  schema: "./src/**/*.graphqls",
  // List of operations
  documents: ["./src/**/*.graphql"],
  generates: {
    // Our base types
    "./src/schema.graphqls.ts": {
      config: typescriptGraphql,
      plugins: [
        {
          add: {
            content: "/* eslint-disable */",
          },
        },
        "typescript",
      ],
    },
    // Generate .graphql.ts files for all .graphql files
    "src/": {
      preset: "near-operation-file",
      presetConfig: {
        extension: ".graphql.ts",
        baseTypesPath: "schema.graphqls.ts",
      },
      config: {
        arrayInputCoercion: false,
        flattenGeneratedTypes: true,
        skipTypeNameForRoot: true,
        operationResultSuffix: "Result",
        // Skip the Query/Mutation/Subscription suffixes
        omitOperationSuffix: true,
        // Slim the resulting TS
        onlyOperationTypes: true,
        // Ensure our operations keep their names
        namingConvention: "keep",
        // Do not add any suffixes, we want to import by operation name
        documentVariableSuffix: "",
        documentMode: "documentNodeImportFragments",
        // And the other settings
        ...typescriptGraphql,
      },
      plugins: [
        {
          add: {
            content: "/* eslint-disable */",
          },
        },
        "typescript-operations",
        // Compiles GraphQL Operations to AST, and adds the TypedDocumentNode
        // type to the exports
        "typed-document-node",
      ],
    },
  },
};

export default config;
