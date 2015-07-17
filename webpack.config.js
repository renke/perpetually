var webpack = require("webpack");

module.exports = {
  devtool: "inline-source-map",

  context: __dirname + "/lib",

  entry: {
    app: [
      "./demo.js",
    ]
  },

  output: {
    path: __dirname + "/demo/",
    filename: "index.js",
    publicPath: "/"
  },

  module: {
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loaders: ["babel-loader?stage=1"] },
    ]
  },

  plugins: [
    new webpack.NoErrorsPlugin(),
  ]
}
require("babel/polyfill");
