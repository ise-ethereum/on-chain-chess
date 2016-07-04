/* global angular, mist, blockies */
import {web3} from '../../contract/Chess.sol';
angular.module('dappChess').factory('accounts', function () {
  let accounts = {
    // Use the first 5 accounts for mist or firefox and the last 5 for other browsers
    availableAccounts: (typeof(mist) !== 'undefined' ||
    window.navigator.userAgent.indexOf('Firefox') !== -1) ?
      web3.eth.accounts.slice(0, Math.floor(web3.eth.accounts.length / 2)) :
      web3.eth.accounts.slice(Math.floor(web3.eth.accounts.length / 2), web3.eth.accounts.length),
    defaultAccount: web3.eth.defaultAccount,
    selectedAccount: null,
    selectedAccountName: null,
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
  accounts.isSelectedAccount = function(account) {
    return accounts.selectedAccount === account;
  };
  accounts.setSelectedAccount = function(account, name) {
    accounts.selectedAccount = account;
    if (name) {
      accounts.selectedAccountName = name;
    }
    else {
      accounts.selectedAccountName = accounts.selectedAccount.substr(0, 7) +
        '...' + accounts.selectedAccount.substr(-7, 7);
    }
  };
  accounts.selectOrCreateAccount = function($event) {
    $event.preventDefault();

    if(typeof(mist) !== 'undefined') {
      accounts.setSelectedAccount(mist.requestAccount());
    }
    else {
      jQuery('#overlay').show();
      jQuery('#selectAccountLayer').show();
    }
  };
  accounts.selectAccount = function(account, name) {
    if(name) {
      accounts.setSelectedAccount(account, name);
    }
    else {
      accounts.setSelectedAccount(account);
    }
    $('#selectAccountLayer').fadeOut();
    $('#overlay').fadeOut();
  };
  return accounts;
}).controller('accountsCtrl', function(accounts, $scope) {
  $scope.accounts = accounts;
});

jQuery(document).ready(function($) {
  $('#overlay').click(function() {
    $('#layers  div.layer').fadeOut();
    $('#overlay').fadeOut();
  });
});
