import { graphql } from "../src";
import { rollup } from "rollup";

process.chdir(__dirname);

test("simple", async () => {
  const bundle = await rollup({
    input: "fixtures/simple/main.js",
    plugins: [
      graphql(),
    ],
  });

  const { output: [{ code }] } = await bundle.generate({
    format: "esm"
  });

  expect(code).toMatchSnapshot();
});

test("fragment", async () => {
  const bundle = await rollup({
    input: "fixtures/fragment/main.js",
    plugins: [
      graphql(),
    ],
  });
  const { output: [{ code }] } = await bundle.generate({
    format: "esm"
  });

  expect(code).toMatchSnapshot();
});

test("schema", async t => {
  const bundle = await rollup({
    input: "fixtures/schema/main.js",
    plugins: [
      graphql(),
    ],
  });
  const { output: [{ code }] } = await bundle.generate({
    format: "esm"
  });

  expect(code).toMatchSnapshot();
});