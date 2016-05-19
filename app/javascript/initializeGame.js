/* global angular */
import {web3, Chess} from '../../contract/Chess.sol';
angular.module('dappChess').controller('InitializeGameCtrl',
  function ($scope) {
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
      Chess.initGame($scope.username, /*$scope.startcolor, */{from: $scope.selectedAccount});
    }

    $scope.initializeGame = function () {
      initializeGame();
    };
  });
