import dts from "rollup-plugin-dts";
import autoExternal from "rollup-plugin-auto-external";

export default [
  {
    input: "./src/index.ts",
    output: { file: "dist/index.d.ts", format: "es", sourcemap: true },
    plugins: [
      autoExternal(),
      dts({
        compilerOptions: {
          paths: [],
        },
      }),
    ],
  },
];
