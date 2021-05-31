/* @flow */

import type { DefinitionNode, FragmentSpreadNode } from "graphql/language";

import { createFilter } from "@rollup/pluginutils";
import { Kind, Source, parse, visit } from "graphql/language";

type TransformedSource = {
  code: string,
  map: {
    mappings: string,
  },
};

type RollupPlugin = {
  name: string,
  transform: (source: string, id: string) => ?TransformedSource,
};

type Options = {
  include?: string | RegExp | Array<string | RegExp>,
  exclude?: string | RegExp | Array<string | RegExp>,
};

const hasOwnProperty = Object.prototype.hasOwnProperty;
const COMMENT_PATTERN = /#([^\n\r]*)/g;
const JS_IDENTIFIER_PATTERN = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
const IMPORT_PATTERN = /import\s*{((?:\s*[_A-Za-z]\w*\s*,?\s*)+)}\s*from\s*(['"])([^\n\r]*)\2/;
const IMPORT_GRAPHQL_LANGUAGE = `import { Kind as __Kind } from "graphql/language";`;

const makeDocument = (name: string, definitions: string): string =>
  `export const ${name} = {\n  kind: __Kind.DOCUMENT,\n  definitions: ${definitions}\n};`;

const definitionOf = (name: string): string => `${name}.definitions`;

const getKeyByValue = (object: { [k: string]: mixed }, value: mixed): ?string =>
  Object.keys(object).find((key: string): boolean => object[key] === value);

/**
 * stringifyNode imitates JSON.stringify but only for GraphQL AST, and will
 * replace kind-values with the imported constants as well as not use
 * stringified-keys if identifiers are valid.
 */
const stringifyNode = (d: mixed): string => {
  if (Array.isArray(d)) {
    return `[${d.map(stringifyNode).join(",")}]`;
  }

  if (!d || typeof d !== "object") {
    return JSON.stringify(d) || "undefined";
  }

  const fields = [];

  if (hasOwnProperty.call(d, "kind")) {
    const kind = getKeyByValue(Kind, d.kind)

    fields.push(`kind:${kind ? `__Kind.${kind}` : JSON.stringify(d.kind) || ""}`);
  }

  for (const k of Object.keys(d)) {
    if (k !== "kind" && d[k] !== undefined) {
      fields.push(
        `${JS_IDENTIFIER_PATTERN.test(k) ? k : JSON.stringify(k)}:${stringifyNode(d[k])}`
      );
    }
  }

  return `{${fields.join(",")}}`;
};

export function graphql(options: Options = {}): RollupPlugin {
  const filter = createFilter(options.include || "**/*.graphql", options.exclude);

  return {
    name: "graphql-ast-import",
    transform(gqlSource: string, id: string): ?TransformedSource {
      if (!filter(id)) {
        return;
      }

      const source = new Source(gqlSource, id);
      const ast = parse(source, { noLocation: true });
      const comments = gqlSource.match(COMMENT_PATTERN) || [];
      const imports = comments.map((line: string): ?string => {
        // TODO: Error handling with this
        const match = line.match(IMPORT_PATTERN);

        if (!match) {
          return null;
        }

        const names = match[1].split(/[, ]/g).map((s: string): string => s.trim()).filter(Boolean);

        return `import { ${names.join(", ")} } from ${JSON.stringify(match[3])};`;
      }).filter(Boolean);

      const definitions = ast.definitions.map((d: DefinitionNode): string => {
        if (!d.name) {
          throw new Error("All queries/mutations must be named");
        }

        const name = d.name.value;
        const used = [];

        visit(d, {
          FragmentSpread(spread: FragmentSpreadNode): void {
            const { name: { value } } = spread;

            if (!used.includes(value)) {
              used.push(value);
            }
          },
        });

        // All imports are documents, so merge the definitions if there are any
        const definitions = used.length > 0 ?
          `[].concat(${
            used.map(definitionOf)
              .concat([stringifyNode(d)])
              .join(", ")})` :
          `[${stringifyNode(d)}]`;

        return makeDocument(name, definitions);
      });

      const parts = [
        IMPORT_GRAPHQL_LANGUAGE,
        imports.join("\n"),
        definitions.join("\n"),
      ];

      return {
        code: parts.filter(Boolean).join("\n"),
        // TODO: Source maps
        map: { mappings: "" },
      };
    },
  };
}
