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

  t.snapshot(extractDefinitionVariablesAndRootFields(doc, "_pre_"));
});
