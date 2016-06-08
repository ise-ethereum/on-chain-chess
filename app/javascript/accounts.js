/* global angular, mist */
import {web3} from '../../contract/Chess.sol';
angular.module('dappChess').factory('accounts', function () {
  return {
    // For testing purposes: Use the first 5 accounts for non-mist and the last 5 for mist browsers
    availableAccounts: (typeof(mist) === 'undefined') ?
      web3.eth.accounts.slice(0, 5) :
      web3.eth.accounts.slice(5, 10),
    defaultAccount: web3.eth.defaultAccount,
    requestAccount: (typeof(mist) !== 'undefined') ?
      mist.requestAccount :
      function(callback) {
        console.log('Not implemented yet');
        callback();
      }
  };
});
