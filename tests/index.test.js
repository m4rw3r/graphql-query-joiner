/* @flow */

import { graphql } from "../src";
import test from "ava";
import { rollup } from "rollup";

process.chdir(__dirname);

test("simple", async t => {
  const bundle = await rollup({
    input: "fixtures/simple/main.js",
    plugins: [
      graphql(),
    ],
  });

  const { output: [{ code }] } = await bundle.generate({
    format: "esm",
  });

  t.snapshot(code);
});

test("fragment", async t => {
  const bundle = await rollup({
    input: "fixtures/fragment/main.js",
    plugins: [
      graphql(),
    ],
  });

  const { output: [{ code }] } = await bundle.generate({
    format: "esm",
  });

  t.snapshot(code);
});

test("schema", async t => {
  const bundle = await rollup({
    input: "fixtures/schema/main.js",
    plugins: [
      graphql(),
    ],
  });

  const { output: [{ code }] } = await bundle.generate({
    format: "esm",
  });

  t.snapshot(code);
});
