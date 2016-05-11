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
        include: __dirname,
      },
    ]
  },

};
