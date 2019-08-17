const chunk = require('lodash/chunk');

const allConfig = require('./config');

const TurnBasedGame = artifacts.require('TurnBasedGame');

const MAX_PENDING_TXS = 4;

const executeBatched = actions =>
  chunk(actions, MAX_PENDING_TXS).reduce(
    (previous, batch) =>
      previous.then(previousResults =>
        Promise.all(batch.map(it => it())).then(result => [...previousResults, ...result])
      ),
    Promise.resolve([])
  );

module.exports = async function(deployer, currentNetwork, [owner]) {
  const config = allConfig[currentNetwork];

  const addresses = config.addressesToHaveBalance || [];
  addresses.push(owner);

  console.log('Deploying Contracts and Libraries');
  await executeBatched([() => deployer.deploy(TurnBasedGame)]);

  console.log('Linking libraries into');
  await Promise.all([]);

  console.log('Getting contracts');
  // deployer.deploy returns undefined. This is not documented in
  // https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations
  const tbg = await TurnBasedGame.deployed();

  if (currentNetwork === 'development' || currentNetwork === 'coverage') {
    // to run only when testing
  }

  console.log('Minting for all the addresses');
  // const DECIMALS = 10 ** 18;
  // const mintFor = (token, address) => token.mint(address, new BN((99 * DECIMALS).toString()));
  // await Promise.all(addresses.map(address => mintFor(bpro, address)));

  console.log({
    tbgAddress: tbg.address
  });
};
