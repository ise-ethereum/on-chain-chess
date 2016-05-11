var path = require('path');

module.exports = {
  entry: [
    './index',
  ],
  output: {
    path: path.resolve('./static/bundles/'),
    publicPath: '/static/bundles/',
    filename: '[name].js',
  },
  web3Loader: {
    constructorParams: {
      Chess: []
    }
  },
  module: {
    preLoaders: [
      {
        test: /\.js$/,
        exclude: [ /node_modules/, /\.tmp/ ],
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
      }
    ]
  },
  jshint: {
    emitErrors: true,
    failOnHint: false
  }
};
