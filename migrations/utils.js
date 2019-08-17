const unzip = require('lodash/unzip');
const {
  scripts: { add, push, create, setAdmin },
  ConfigVariablesInitializer
} = require('zos');

const utilsBuilder = artifacts => {
  const Governor = artifacts.require('Governor');
  const ProxyAdmin = artifacts.require('ProxyAdmin');
  const UpgradeDelegator = artifacts.require('UpgradeDelegator');
  const AddTokenPairChanger = artifacts.require('AddTokenPairChanger');

  const deployGovernanceContracts = async (owner, options, deployer) => {
    // This function deploys every contract needed to govern the exchange contracts

    // Add the mapping between a proxy an its alias
    await add({
      contractsData: [{ name: 'Governor', alias: 'Governor' }]
    });

    console.log('Pushing implementations');

    // Push implementation contracts to the current network
    await push(options);

    // Create an instance of Governor, setting initial value to owner
    console.log('Deploying an upgradeable governor');
    const governor = await create({
      contractAlias: 'Governor',
      initMethod: 'initialize',
      initArgs: [owner],
      ...options
    });

    // This two are in charge of upgrades, the admin is in charge of some proxies
    // and these proxies can be upgraded only if the upgrade call comes from its admin.
    // The UpgradeDelegator just forwards the upgrade calls to the admin if the governor
    // approved that call. For more info, refer to the readme of the governance repository
    console.log('Deploying a non-upgradeable upgradeDelegator and a non-upgradeable admin');
    await deployer.deploy(ProxyAdmin);
    await deployer.deploy(UpgradeDelegator);

    const admin = await ProxyAdmin.deployed();
    const upgradeDelegator = await UpgradeDelegator.deployed();

    await upgradeDelegator.initialize(governor.address, admin.address);

    // Transfers the ownership of the admin to the upgradeDelegator, so the upgradeDelegator is enabled to
    // forward the upgrade calls
    await admin.transferOwnership(upgradeDelegator.address);

    // Gives  the admin and, in consequence, the upgradeDelegator the right to upgrade the governor
    await setAdmin({ contractAlias: 'Governor', newAdmin: admin.address, ...options });

    // Returns all the contracts needed
    return Promise.all([
      Governor.at(governor.address), // Returns a truffle object to have a consistent API
      ProxyAdmin.deployed(),
      UpgradeDelegator.deployed()
    ]);
  };

  // Returns the set of necesary contracts, it uses the deployed ones or deploys a new set if none are deployed in the network already
  const getGovernanceContracts = async (config, owner, options, deployer) =>
    config.deployGovernance
      ? deployGovernanceContracts(owner, options, deployer)
      : Promise.all([
          Governor.at(config.governorAddress),
          ProxyAdmin.at(config.proxyAdminAddress),
          UpgradeDelegator.at(config.upgradeDelegatorAddress)
        ]);

  const addTokenPairs = async (tokenPairsToAdd, dex, governor) => {
    // Get the pairs params in a list of the params each
    const [baseTokens, secondaryTokens, precisions, prices] = unzip(tokenPairsToAdd);

    // Deploy the changer contract with the given params
    const addTokenPair = await AddTokenPairChanger.new(
      dex.address,
      baseTokens,
      secondaryTokens,
      precisions,
      prices
    );

    // Actually execute the changer
    console.log('Adding tokens pairs');
    await governor.executeChange(addTokenPair.address);
  };

  return {
    getGovernanceContracts,
    addTokenPairs
  };
};

module.exports = utilsBuilder;
