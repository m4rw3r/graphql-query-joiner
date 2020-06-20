export default {
  babel: {
    testOptions: {
      babelrc: false,
      configFile: true,
    },
    compileAsTests: ["src/**/*", "tests/**/*"],
  },
  files: [
    "tests/**/*.test.js",
  ],
  powerAssert: true,
  snapshotDir: "tests/snapshots",
  require: [
    "esm",
  ],
};
