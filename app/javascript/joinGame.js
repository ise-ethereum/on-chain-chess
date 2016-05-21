/* global angular */
import {web3, Chess} from '../../contract/Chess.sol';
angular.module('dappChess').controller('JoinGameCtrl',
  function ($rootScope, $scope) {
    $scope.availableAccounts = web3.eth.accounts;
    $scope.selectedAccount = web3.eth.defaultAccount;
    $scope.username = null;
    $scope.gameId = null;

    $scope.isSelectedAccount = function (account) {
      return $scope.selectedAccount === account;
    };
    $scope.selectAccount = function (account) {
      $scope.selectedAccount = account;
    };

    function joinGame() {
      $rootScope.$broadcast('message', 'Trying to join the game, please wait a moment...',
                            'loading', 'joingame');
      Chess.joinGame($scope.gameId, $scope.username, {from: $scope.selectedAccount});
    }

    $scope.joinGame = function (form) {
      if(form.$valid) {
        joinGame();
      }
    };
  });
