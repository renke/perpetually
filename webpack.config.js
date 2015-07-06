var webpack = require("webpack");

module.exports = {
  devtool: "eval-source-map",

  context: __dirname + "/lib",

  entry: {
    app: [
      "./index.js",
    ]
  },

  output: {
    path: __dirname + "/build/",
    filename: "index.js",
    publicPath: "/"
  },

  module: {
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loaders: ["babel-loader?stage=1"] },
    ]
  },

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
  ]
}