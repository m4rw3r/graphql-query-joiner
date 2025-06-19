import js from "@eslint/js";
import tsEslint from "typescript-eslint";

export default tsEslint.config(
  {
    ignores: ["**/dist/**/*", "**/*.test-d.ts"],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tsEslint.configs.recommendedTypeChecked,
      ...tsEslint.configs.stylisticTypeChecked,
      ...tsEslint.configs.strictTypeChecked,
      tsEslint.configs.eslintRecommended,
    ],
    plugins: {
      "@typescript-eslint": tsEslint.plugin,
    },
    languageOptions: {
      parser: tsEslint.parser,
      ecmaVersion: 5,
      sourceType: "script",
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-deprecated": "off",
    },
  },
);
