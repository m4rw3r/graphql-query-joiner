module.exports = {
  files: [
    "tests/**/*.test.js",
  ],
  snapshotDir: "tests/snapshots",
  require: [
    "@babel/register",
  ],
};
