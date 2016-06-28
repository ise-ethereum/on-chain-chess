var path = require('path');

var rpcport = process.env.TESTRPC_PORT || '8545';
var web3provider = process.env.WEB3_PROVIDER || 'http://localhost:' + rpcport;
console.log('Building with web3 provider: ', web3provider);

var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  devtool: 'source-map',
  entry: ['./index'],
  output: {
    path: path.resolve('./static/'),
    publicPath: '/bundles/',
    filename: '[name].js'
  },
  web3Loader: {
    provider: web3provider,
    constructorParams: {
      Chess: [true] // Enable debugging
    }
  },
  module: {
    preLoaders: [
      {
        test: /\.js$/,
        exclude: [/node_modules/, /\.tmp/],
        loader: 'jshint-loader'
      }
    ],
    loaders: [
      {
        test: /\.sol$/,
        loaders: ['web3', 'solc']
      },
      {
        test: /\.json$/,
        loaders: ['json']
      },
      {
        test: /\.js$/,
        loaders: ['babel'],
        exclude: /node_modules/,
        include: __dirname
      },
      {
        test: /\.(png)|(jpg)|(gif)|(otf)|(eot)|(ttf)|(woff)|(svg)$/,
        loaders: ['file-loader']
      },
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract('style-loader',
                'css?sourceMap!' +
                'less?sourceMap'
                )
      }
    ]
  },
  jshint: {
    emitErrors: false,
    failOnHint: false
  },
  plugins: [
    new ExtractTextPlugin('styles.css')
  ]
};
