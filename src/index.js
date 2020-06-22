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

const COMMENT_PATTERN = /#([^\n\r]*)/g;
const IMPORT_PATTERN = /import\s*{((?:\s*[_A-Za-z]\w*\s*,?\s*)+)}\s*from\s*(['"])([^\n\r]*)\2/;

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

        // All imports are documents, so merge the definitions
        return `export const ${name} = {
  kind: ${JSON.stringify(Kind.DOCUMENT)},
  definitions: [].concat(${used.map((name: string): string => `${name}.definitions`).concat([JSON.stringify(d)]).join(", ")})
};`;
      });

      const code = imports.join("\n") + "\n" + definitions.join("\n");

      return {
        code,
        // TODO: Source maps
        map: { mappings: "" },
      };
    },
  };
}
