/* global angular */
import {
  web3, Chess
}
from
'../../contract/Chess.sol';
angular.module('dappChess')
        .controller('InitializeGameCtrl', ['$scope', function ($scope) {
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

            $scope.initializeGame = function () {
              initializeGame();
            };

            function gameInitialized(a, b, c) {
              console.log(a, b, c);
            }

            function initializeGame() {
              console.log(Chess.initGame, $scope.selectedAccount, typeof ($scope.selectedAccount));
              Chess.initGame($scope.selectedAccount/*, $scope.startcolor, $scope.username */);

              Chess.GameInitialized({}, gameInitialized);
            }
          }]);
