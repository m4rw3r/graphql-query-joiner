/* @flow */

import test from "ava";
import { parse } from "graphql/language";

import { extractDefinitionVariablesAndRootFields } from "./parser";

test("Fragments with variables", t => {
  const doc = parse(`
    fragment Foo on Bar {
      getIt(theparam: $param) {
        data
      }
    }

    query ($param: String!) {
      here {
        ...Foo
      }
    }
  `, { noLocation: true });

  const { operation, fragments, rootFields, variableDefinitions } = extractDefinitionVariablesAndRootFields(doc, "_pre_");

  console.log(operation.toJSON());
});
