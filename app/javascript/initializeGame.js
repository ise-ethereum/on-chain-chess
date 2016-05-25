/* global angular */
import {web3, Chess} from '../../contract/Chess.sol';
angular.module('dappChess').controller('InitializeGameCtrl',
  function ($rootScope, $scope) {
    $scope.availableAccounts = web3.eth.accounts;
    $scope.selectedAccount = web3.eth.defaultAccount;
    $scope.startcolor = 'white';
    $scope.username = null;

    $scope.isSelectedAccount = function (account) {
      return $scope.selectedAccount === account;
    };
    $scope.selectAccount = function (account) {
      $scope.selectedAccount = account;
    };

    function initializeGame() {
      $rootScope.$broadcast('message', 'Your game is being created, please wait a moment...',
                            'loading', 'startgame');
      try {
        Chess.initGame($scope.username, $scope.startcolor === 'white',
                     { from: $scope.selectedAccount });
      }
      catch(e) {
        $rootScope.$broadcast('message', 'Could not initialize the game', 'loading', 'startgame');
      }

    }

    $scope.initializeGame = function (form) {
      if(form.$valid) {
        initializeGame();
      }
    };
  });
