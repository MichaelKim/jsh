const core = require("@babel/core");

function loader(source) {
  const stripped = core.transform(source, {
    plugins: ["@babel/plugin-transform-flow-strip-types"]
  });
  const code = stripped.code.slice(0, -1);
  return `module.exports = String(${code})`;
}

module.exports = loader;
