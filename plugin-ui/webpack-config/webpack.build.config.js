const path = require("path");
const { merge } = require("webpack-merge");
const TerserWebpackPlugin = require("terser-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const createBaseConfig = require("./webpack.base.config.js");

const name = "plugin-ui";

/**
 * @returns {import('webpack').Configuration}
 */
const createBuildConfig = () => ({
  mode: "production",
  output: {
    path: path.resolve(__dirname, "../dist"),
    filename: "[name].[chunkhash].js", // 使用 chunkhash 作为文件名，以便缓存和版本控制
    library: `${name}-[name]`,
    libraryTarget: "umd",
    globalObject: "window",
  },
  devtool: "source-map",
  optimization: {
    minimize: true, // 开始最小化
    minimizer: [new TerserWebpackPlugin()],
    splitChunks: {
      chunks: "async", // 对所有代码块进行分割
      maxSize: 1024, // 最大体积（字节），0表示无限制
      minChunks: 1, // 最小代码块数
      maxAsyncRequests: 30, // 最大异步请求数
      maxInitialRequests: 30, // 最大初始请求数
      automaticNameDelimiter: "~", // 名称分隔符
      name: "common", // 根据模块和缓存组生成名称
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10, // 更高的优先级
        },
        default: {
          minChunks: 2,
          priority: -20, // 更低的优先级
          reuseExistingChunk: true, // 如果模块已经被打包，重用它而不是创建新的模块
        },
      },
    },
    runtimeChunk: "single", // 将运行时代码提取为单独的 chunk
  },
  plugins: [new CleanWebpackPlugin()],
});

module.exports = merge(createBuildConfig(), createBaseConfig());
