const workerLoader = require("../loaders/worker-loader");

module.exports = {
  process(src, filename, config, options) {
    return workerLoader(src);
  }
};
