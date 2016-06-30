/* global angular */
import {web3, Chess} from '../../contract/Chess.sol';
angular.module('dappChess').controller('JoinGameCtrl',
  function ($rootScope, $scope, games, accounts) {
    $scope.username = null;
    $scope.gameId = null;
    $scope.games = games.list;
    $scope.openGames = games.openGames;
    $scope.etherbet = 0;

    $scope.accounts = accounts;

    $scope.setSelectedGame = function($event, game) {
      $scope.gameId = game.gameId;
      $scope.etherbet = game.value;

      $event.preventDefault();
    };
    $scope.isSelectedGame = function(game) {
      return $scope.gameId === game.gameId;
    };

    function joinGame() {
      $rootScope.$broadcast('message', 'Trying to join the game, please wait a moment...',
                            'loading', 'joingame');
      try {
        console.log('Trying to join game', $scope.gameId, $scope.username,
          {
            from: $scope.selectedAccount,
            value: web3.toWei($scope.etherbet.replace(',', '.'), 'ether')
          });
        Chess.joinGame($scope.gameId, $scope.username,
          {
            from: $scope.selectedAccount,
            value: web3.toWei($scope.etherbet.replace(',', '.'), 'ether')
          });
      }
      catch(e) {
        console.log('Error joining the game', e);
        $rootScope.$broadcast('message', 'Could not join the game', 'loading', 'joingame');
      }
    }

    $scope.joinGame = function (form) {
      if(form.$valid) {
        joinGame();
      }
    };


  });
