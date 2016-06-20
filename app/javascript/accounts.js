/* global angular, mist */
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
      }
  };
});
