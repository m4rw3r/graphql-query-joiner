/* @flow */

import { createFilter } from "@rollup/pluginutils";
import { Kind, Source, parse, visit } from "graphql/language";

const COMMENT_PATTERN = /#([^\n\r]*)/g;
const IMPORT_PATTERN = /import\s*{((?:\s*[_A-Za-z][_0-9A-Za-z]*\s*,?\s*)+)}\s*from\s*(['"])([^\n\r]*)\2/;

function graphql(options = {}) {
  let filter = createFilter(options.include || "**/*.graphql", options.exclude);

  return {
    name: "graphql-ast-import",
    transform(gqlSource, id) {
      if (!filter(id)) {
        return;
      }

      const source = new Source(gqlSource, id)
      const ast = parse(source, { noLocation: true });
      const comments = gqlSource.match(COMMENT_PATTERN) || [];
      const imports = comments.map(line => {
        // TODO: Error handling with this
        const match = line.match(IMPORT_PATTERN);

        if(match) {
          const names = match[1].split(/[, ]/g).map(s => s.trim()).filter(x => x);

          return `import { ${names.join(", ")} } from ${JSON.stringify(match[3])};`;
        }
      }).filter(x => x);

      const definitions = ast.definitions.map(d => {
        if (!d.name) {
          throw new Error("All queries/mutations must be named");
        }

        const name = d.name.value;
        const used = [];

        visit(d, {
          FragmentSpread(spread) {
            const { name: { value } } = spread;

            if (!used.includes(value)) {
              used.push(value);
            }
          },
        });

        // All imports are documents, so merge the definitions
        return `export const ${name} = {
  kind: ${JSON.stringify(Kind.DOCUMENT)},
  definitions: [].concat(${used.map(name => `${name}.definitions`).concat([JSON.stringify(d)]).join(", ")})
};`;
      });

      const code = imports.join("\n") + "\n" + definitions.join("\n");

      return {
        code,
        // TODO: Source maps
        map: { mappings: "" },
      };
    }
  };
}
