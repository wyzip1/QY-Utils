const { merge } = require("webpack-merge");
const createBaseConfig = require("./webpack.base.config.js");

/**
 * @returns {import('webpack').Configuration}
 */
const createDevConfig = () => ({
  mode: "development",
  cache: {
    type: "filesystem",
  },
  devtool: "cheap-module-source-map",
  devServer: {
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    client: {
      overlay: false,
    },
    proxy: {
      "/image": {
        target: "http://192.168.0.181:8181/",
        changeOrigin: true,
        pathRewrite: {
          // "^/image": "",
        },
      },
      "/developmentApi": {
        target: "http://192.168.0.181:8181/",
        changeOrigin: true,
        pathRewrite: {
          "^/developmentApi": "",
        },
      },
    },
  },
});

module.exports = merge(createDevConfig(), createBaseConfig());
