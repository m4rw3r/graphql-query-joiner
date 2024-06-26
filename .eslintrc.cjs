module.exports = {
  ignorePatterns: ["**/dist/**/*", "**/*.test-d.ts"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:@typescript-eslint/strict-type-checked",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
  root: true,
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      rules: {
        // We need a lot of any for TypedDocumentNode to avoid having to fully
        // specify variables and result types all the time:
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/restrict-template-expressions": [
          "error",
          { allowNumber: true },
        ],
      },
    },
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: {
        // act() does return a promise
        "@typescript-eslint/await-thenable": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
      },
    },
  ],
};
