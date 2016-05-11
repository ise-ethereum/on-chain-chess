var nodeExternals = require('webpack-node-externals');
// Extends base config
var config = require('./webpack.config.js');

config.output = {
  devtoolModuleFilenameTemplate: '[absolute-resource-path]',
  devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
};

config.target = 'node';

config.externals = [nodeExternals()];
config.devtool = 'cheap-module-source-map';

module.exports = config;
