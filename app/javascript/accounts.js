/* global angular, mist, blockies */
import {web3} from '../../contract/Chess.sol';
angular.module('dappChess').factory('accounts', function () {
  return {
    // Use the first 5 accounts for mist or firefox and the last 5 for other browsers
    availableAccounts: (typeof(mist) !== 'undefined' ||
    window.navigator.userAgent.indexOf('Firefox') !== -1) ?
      web3.eth.accounts.slice(0, Math.floor(web3.eth.accounts.length / 2)) :
      web3.eth.accounts.slice(Math.floor(web3.eth.accounts.length / 2), web3.eth.accounts.length),
    defaultAccount: web3.eth.defaultAccount,
    requestAccount: (typeof(mist) !== 'undefined') ?
      mist.requestAccount :
      function(callback) {
        console.log('Not implemented yet');
        callback();
      },
    // Get ether balance with 4 digit precision
    getBalance: function(account) {
      if(web3.eth.accounts.indexOf(account) !== -1) {
        return web3.fromWei(
            web3.eth.getBalance(account), 'ether'
          ).toDigits(20, 3).toString(10);
      }

      return false;
    },
    getBlockie: function(account) {
      if(account) {
        return {
          'background-image': 'url(\'' + blockies.create({
            seed: account
          }).toDataURL() + '\')'
        };
      }
      else {
        return {};
      }
    }
  };
});
