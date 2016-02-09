import express from "express";
import makeWebpackDevMiddleware from "webpack-dev-middleware";
import makeWebpackHotMiddleware from "webpack-hot-middleware";
import path from "path";
import webpack from "webpack";

import config from "./webpack.config.babel.js";

const app = express();
const compiler = webpack(config);

const webpackDevMiddleware = makeWebpackDevMiddleware(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath,

  stats: {
    colors: true,
  },
});

app.use(webpackDevMiddleware);

app.use(makeWebpackHotMiddleware(compiler));

app.get("*", (req, res) => {
  const file = webpackDevMiddleware.fileSystem.readFileSync(path.join(config.output.path, "index.html"));
  res.end(file);
});

const PORT = 3000;
const ADDRESS = "localhost";

app.listen(PORT, ADDRESS, err => {
  if (err) {
    console.error(err); // eslint-disable-line no-console
    return;
  }

  console.log(`Listening at http://${ADDRESS}:${PORT}`); // eslint-disable-line no-console
});
