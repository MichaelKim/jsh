const core = require("@babel/core");

function loader(source) {
  const stripped = core.transform(source, {
    plugins: [
      "@babel/plugin-proposal-object-rest-spread",
      "@babel/plugin-transform-flow-strip-types"
    ]
  });
  const code = stripped.code;
  return `
    const code = String(()=>{${code}});
    const start = code.indexOf('{') + 1;
    const end = code.lastIndexOf('}');
    module.exports = code.slice(start, end);
  `;
}

module.exports = loader;
