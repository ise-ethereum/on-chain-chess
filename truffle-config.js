module.exports = {
  // Uncommenting the defaults below
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  compilers: {
    solc: {
      version: '0.5.10',
      evmVersion: 'byzantium',
      settings: {
        optimizer: {
          enabled: true,
          runs: 1
        }
      }
    }
  },
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*'
    },
    test: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*'
    },
    coverage: {
      host: '127.0.0.1',
      port: 8555,
      network_id: '*'
    }
  },
  mocha: {
    useColors: true,
    bail: true
  }
};
