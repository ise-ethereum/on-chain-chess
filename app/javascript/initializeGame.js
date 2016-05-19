/* global angular */
import {
  web3
}
from
'../../contract/Chess.sol';
angular.module('dappChess')
        .controller('InitializeGameCtrl', ['$scope', function ($scope) {
            $scope.availableAccounts = web3.eth.accounts;
            $scope.selectedAccount = null;
            $scope.startcolor = 'white';
            $scope.username = null;

            $scope.isSelectedAccount = function (account) {
              return $scope.selectedAccount === account;
            };
            $scope.selectAccount = function (account) {
              $scope.selectedAccount = account;
            };
          }]);
