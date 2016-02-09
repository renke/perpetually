import path from "path";
import webpack from "webpack";

let entry = [
  "./index.js",
];

let devtool;

const DEFAULT_NODE_ENV = "development";

let plugins = [
  new webpack.DefinePlugin({
    "process.env.NODE_ENV": `"${process.env.NODE_ENV || DEFAULT_NODE_ENV}"`,
  }),

  new webpack.optimize.OccurenceOrderPlugin(),
];

if (process.env.NODE_ENV === "production") {
  plugins = [
    ...plugins,
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
      },
      sourceMap: true,
    }),
  ];
} else {
  entry = [
    "webpack-hot-middleware/client?reload=true",  
    ...entry,
  ];

  devtool = "inline-source-map";

  plugins = [
    ...plugins,
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
  ];
}

export default {
  entry,
  devtool,
  plugins,

  context: path.join(__dirname, "example/src"),

  output: {
    publicPath: "/",
    path: path.join(__dirname, "example/lib"),
    filename: "index.js",
  },

  module: {
    loaders: [
      { test: /\.js$/, include: path.join(__dirname, "example/src"), loaders: ["babel"] },
    ],
  },
};
