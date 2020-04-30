/* @flow */

module.exports = {
  babelrc: false,
  ignore: [
    "node_modules/**/*.js",
  ],
  presets: [
    ["@babel/preset-env", {
      loose: true,
      // No targets = ECMAScript 5
    }],
  ],
  plugins: [
    // We cannot use the preset since this must go before class-properties to
    // avoid emitting `this.propertyName = void 0;` for typed class properties
    ["@babel/plugin-transform-flow-strip-types"],
    // Loose mode for array destructuring, object-rest-spread is larger this
    // way since babel uses a for-loop instead of delete.
    // Implement object-rest-spread manually instead
    ["@babel/plugin-transform-destructuring", { loose: true }],
    // Ensure we only compile for arrays to avoid unnecessary shims
    ["@babel/plugin-transform-spread", { loose: true }],
    // Ensure we only compile for arrays to avoid unnecessary shims
    ["@babel/plugin-transform-for-of", { assumeArray: true }],
    // Mainly for tests
    ["babel-plugin-transform-async-to-promises", { hoist: true }],
  ],
};
