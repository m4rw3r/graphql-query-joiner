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
    // Mainly for tests
    ["babel-plugin-transform-async-to-promises", { hoist: true }],
  ],
};
