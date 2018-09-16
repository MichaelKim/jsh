const fs = require("fs");
const core = require("@babel/core");

function loader(source) {
  const workerFile = fs.readFileSync("./src/worker.js").toString();
  const stripped = core.transform(workerFile, {
    plugins: ["@babel/plugin-transform-flow-strip-types"]
  });
  const code = stripped.code.slice(0, -1);
  return `module.exports = String(${code})`;
}

module.exports = loader;
