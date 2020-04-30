import babelPlugin from "rollup-plugin-babel";
import nodeResolve from "rollup-plugin-node-resolve";
import gzipPlugin from "rollup-plugin-gzip";
import { terser } from "rollup-plugin-terser";

const COMPRESS = true;

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
  preserveModules: !COMPRESS,
  plugins: [
    nodeResolve(),
    babelPlugin({
      babelrc: false,
      configFile: "./babel.config.cjs",
    }),
    terser({
      parse: {

      },
      compress: {

      },
      mangle: {
      },
      output: {
        beautify: !COMPRESS,
      },
      ecma: 5,
      module: true,
      ie8: false,
    }),
    gzipPlugin({
      gzipOptions: {
        level: 9,
      },
    }),
  ],
  external: [
    "graphql/language",
  ],
};
