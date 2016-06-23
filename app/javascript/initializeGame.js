/* global angular */
import {web3, Chess} from '../../contract/Chess.sol';
angular.module('dappChess').controller('InitializeGameCtrl',
  function ($rootScope, $scope, accounts) {
    $scope.availableAccounts = accounts.availableAccounts;
    $scope.selectedAccount = accounts.defaultAccount;
    $scope.startcolor = 'white';
    $scope.username = null;
    $scope.etherbet = 0;

    $scope.isSelectedAccount = function (account) {
      return $scope.selectedAccount === account;
    };

    function initializeGame() {
      $rootScope.$broadcast('message', 'Your game is being created, please wait a moment...',
                            'loading', 'startgame');
      try {

        Chess.initGame($scope.username, $scope.startcolor === 'white',
         {
           from: $scope.selectedAccount,
           value: web3.toWei($scope.etherbet, 'ether')
         });
      }
      catch(e) {
        $rootScope.$broadcast('message', 'Could not initialize the game', 'loading', 'startgame');
      }
    }

    $scope.selectOrCreateAccount = function($event) {
      $event.preventDefault();

      accounts.requestAccount(function(e, address) {
        $scope.selectedAccount = address;
      });
    };

    $scope.initializeGame = function (form) {
      if(form.$valid) {
        initializeGame();
      }
    };

    $scope.getBalance = accounts.getBalance;
  });
