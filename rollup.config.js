import babelPlugin from "@rollup/plugin-babel";
import nodeResolve from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.js",
  output: [
    {
      dir: "dist/esm",
      sourcemap: true,
      format: "esm",
    },
    {
      dir: "dist/cjs",
      sourcemap: true,
      format: "cjs",
    },
  ],
  preserveModules: true,
  plugins: [
    nodeResolve(),
    babelPlugin({
      babelrc: false,
      configFile: "./babel.config.cjs",
      babelHelpers: "bundled",
    }),
  ],
  external: [
    /^graphql(\/.+)*$/,
  ],
};
