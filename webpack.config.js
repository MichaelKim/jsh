const path = require("path");

module.exports = {
  entry: path.resolve(__dirname, "src/index.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "jsh.js",
    library: "jsh"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /src\/worker\.js$/,
        exclude: /node_modules/,
        use: {
          loader: path.resolve(__dirname, "loaders/worker-loader")
        }
      }
    ]
  }
};
