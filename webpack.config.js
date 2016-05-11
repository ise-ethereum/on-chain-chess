var path = require("path");

module.exports = {
  entry: [
    './index',
  ],
  output: {
    path: path.resolve('./static/bundles/'),
    publicPath: '/static/bundles/',
    filename: "[name].js",
    chunkFilename: "[id].js"
  },
  web3Loader: {
    constructorParams: {
      Chess: []
    }
  },
  module: {
    preLoaders: [
      {
        test: /\.js$/, // include .js files
        exclude: [ /node_modules/, /\.tmp/ ], // exclude any and all files in the node_modules folder
        loader: "jshint-loader"
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
      }
    ]
  },
  jshint: {
    // jshint errors are displayed by default as warnings
    // set emitErrors to true to display them as errors
    emitErrors: true,
    // jshint to not interrupt the compilation
    // if you want any file with jshint errors to fail
    // set failOnHint to true
    failOnHint: false
  }
};
