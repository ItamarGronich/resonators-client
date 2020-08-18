'use strict';  // eslint-disable-line

/**
 * Webpack configuration base class
 */
const fs = require('fs');
const path = require('path');
const { EnvironmentPlugin } = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const WebpackPwaManifest = require("webpack-pwa-manifest");
const manifest = require("../../src/manifest");

const npmBase = path.join(__dirname, '../../node_modules');

class WebpackBaseConfig {

  constructor() {
    this._config = {};
  }

  /**
   * Get the list of included packages
   * @return {Array} List of included packages
   */
  get includedPackages() {
    return [].map((pkg) => fs.realpathSync(path.join(npmBase, pkg)));
  }

  /**
   * Set the config data.
   * This will always return a new config
   * @param {Object} data Keys to assign
   * @return {Object}
   */
  set config(data) {
    this._config = Object.assign({}, this.defaultSettings, data);
    return this._config;
  }

  /**
   * Get the global config
   * @return {Object} config Final webpack config
   */
  get config() {
    return this._config;
  }

  /**
   * Get the environment name
   * @return {String} The current environment
   */
  get env() {
    return 'dev';
  }

  /**
   * Get the absolute path to src directory
   * @return {String}
   */
  get srcPathAbsolute() {
    return path.resolve('./src');
  }

  /**
   * Get the absolute path to tests directory
   * @return {String}
   */
  get testPathAbsolute() {
    return path.resolve('./test');
  }

  /**
   * Get the client assets path
   * @returns {String}
   */
  get assetPath() {
    return "/assets/"
  }

  /**
   * Get the default settings
   * @return {Object}
   */
  get defaultSettings() {
    const cssModulesQuery = {
      modules: {
        localIdentName: '[name]-[local]-[hash:base64:5]'
      },
      importLoaders: 1,
    };

    return {
      context: this.srcPathAbsolute,
      devtool: 'eval',
      devServer: {
        contentBase: './src/',
        publicPath: '/assets/',
        historyApiFallback: true,
        hot: true,
        inline: true,
        port: 8000,
        proxy: {
          '/api': 'http://localhost:8080',
        },
        headers: {
          "Service-Worker-Allowed": "/"
        }
      },
      entry: './index.js',
      module: {
        rules: [
          {
            enforce: 'pre',
            test: /\.js?$/,
            include: this.srcPathAbsolute,
            loaders: [{
                loader: 'babel-loader',
            }, {
                loader: 'eslint-loader'
            }]
          },
          {
            test: /^.((?!cssmodule).)*\.css$/,
            loaders: [
              { loader: 'style-loader' },
              { loader: 'css-loader' }
            ]
          },
          {
            test: /\.(png|jpg|gif|mp4|ogg|svg|woff|woff2|ttf)$/,
            loader: 'file-loader'
          },
          {
            test: /^.((?!cssmodule).)*\.(sass|scss)$/,
            loaders: [
              { loader: 'style-loader' },
              { loader: 'css-loader' },
              { loader: 'sass-loader' }
            ]
          },
          {
            test: /^.((?!cssmodule).)*\.less$/,
            loaders: [
              { loader: 'style-loader' },
              { loader: 'css-loader' },
              { loader: 'less-loader' }
            ]
          },
          {
            test: /^.((?!cssmodule).)*\.styl$/,
            loaders: [
              { loader: 'style-loader' },
              { loader: 'css-loader' },
              { loader: 'stylus-loader' }
            ]
          },
          {
            test: /\.json$/,
            loader: 'json-loader'
          },
          {
            test: /\.(js|jsx)$/,
            include: [].concat(
              this.includedPackages,
              [this.srcPathAbsolute]
            ),
            loaders: [
              // Note: Moved this to .babelrc
              { loader: 'babel-loader' }
            ]
          },
          {
            test: /\.cssmodule\.(sass|scss)$/,
            loaders: [
              { loader: 'style-loader' },
              {
                loader: 'css-loader',
                query: cssModulesQuery
              },
              { loader: 'sass-loader' }
            ]
          },
          {
            test: /\.cssmodule\.css$/,
            loaders: [
              { loader: 'style-loader' },
              {
                loader: 'css-loader',
                query: cssModulesQuery
              }
            ]
          },
          {
            test: /\.cssmodule\.less$/,
            loaders: [
              { loader: 'style-loader' },
              {
                loader: 'css-loader',
                query: cssModulesQuery
              },
              { loader: 'less-loader' }
            ]
          },
          {
            test: /\.cssmodule\.styl$/,
            loaders: [
              { loader: 'style-loader' },
              {
                loader: 'css-loader',
                query: cssModulesQuery
              },
              { loader: 'stylus-loader' }
            ]
          }
        ]
      },
      output: {
        path: path.resolve('./dist/assets'),
        filename: 'app.js',
        publicPath: this.assetPath,
      },
      plugins: [
        new CopyPlugin({
          patterns: [{ from: `${this.srcPathAbsolute}/serviceWorker.js` }],
        }),
        new WebpackPwaManifest({
          ...manifest,
          filename: "manifest.webmanifest",
        }),
        new EnvironmentPlugin({
          ASSET_PATH: this.assetPath
        }),
      ],
      resolve: {
        alias: {
          actions: `${this.srcPathAbsolute}/actions/`,
          components: `${this.srcPathAbsolute}/components/`,
          config: `${this.srcPathAbsolute}/config/${this.env}.js`,
          images: `${this.srcPathAbsolute}/images/`,
          sources: `${this.srcPathAbsolute}/sources/`,
          stores: `${this.srcPathAbsolute}/stores/`,
          styles: `${this.srcPathAbsolute}/styles/`
        },
        extensions: ['.js', '.jsx'],
        modules: [
          this.srcPathAbsolute,
          'node_modules'
        ]
      }
    };
  }
}

module.exports = WebpackBaseConfig;
