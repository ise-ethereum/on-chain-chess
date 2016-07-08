/* global angular */
import {web3, Chess} from '../../contract/Chess.sol';
angular.module('dappChess').controller('InitializeGameCtrl',
  function ($rootScope, $scope, accounts) {
    $scope.startcolor = 'white';
    $scope.username = null;
    $scope.etherbet = 0;

    $scope.accounts = accounts;

    function initializeGame() {
      $rootScope.$broadcast('message', 'Your game is being created, please wait a moment...',
                            'loading', 'startgame');
      try {
        console.log('Trying to initialize game', $scope.username,
          {
            from: accounts.selectedAccount,
            value: web3.toWei($scope.etherbet / 2, 'ether')
          });
        Chess.initGame($scope.username, $scope.startcolor === 'white',
         {
           from: accounts.selectedAccount,
           value: web3.toWei($scope.etherbet / 2, 'ether')
         });
      }
      catch(e) {
        console.log('Error on initialize game', e);
        $rootScope.$broadcast('message', 'Could not initialize the game', 'loading', 'startgame');
      }
    }

    $scope.initializeGame = function (form) {
      if(form.$valid) {
        initializeGame();
      }
    };
  });
