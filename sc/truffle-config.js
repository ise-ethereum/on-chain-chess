const HDWalletProvider = require('truffle-hdwallet-provider');

const mnemonic = 'weird tiny help punch grow typical endorse update ivory minute topic tennis';
module.exports = {
  // Uncommenting the defaults below
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  compilers: {
    solc: {
      version: '0.5.8',
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
    },
    rskTestnet: {
      // 0xd51128f302755666c42e3920d72ff2fe632856a9
      host: 'http://50.116.28.95:4444/',
      provider: new HDWalletProvider(mnemonic, 'http://50.116.28.95:4444/'),
      network_id: '*',
      gasPrice: 0x000001
    }
  },
  mocha: {
    useColors: true,
    bail: true
  }
};
