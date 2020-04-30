/* @flow */

export default {
  babel: {
    testOptions: {
      babelrc: false,
      configFile: true,
    },
    compileAsTests: ["src/**/*"],
  },
  files: [
    "**/*.test.js",
  ],
  powerAssert: true,
  snapshotDir: "snapshots",
  require: [
    "esm",
  ],
};
