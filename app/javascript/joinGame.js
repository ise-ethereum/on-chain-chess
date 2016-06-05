/* global angular */
import {Chess} from '../../contract/Chess.sol';
angular.module('dappChess').controller('JoinGameCtrl',
  function ($rootScope, $scope, games, accounts) {
    $scope.availableAccounts = accounts.availableAccounts;

    $scope.selectedAccount = accounts.defaultAccount;
    $scope.username = null;
    $scope.gameId = null;
    $scope.games = games.list;
    $scope.openGames = games.openGames;

    $scope.isSelectedAccount = function (account) {
      return $scope.selectedAccount === account;
    };
    $scope.selectAccount = function (account) {
      $scope.selectedAccount = account;
    };
    $scope.setSelectedGame = function($event, game) {
      $scope.gameId = game.gameId;

      $event.preventDefault();
    };
    $scope.isSelectedGame = function(game) {
      return $scope.gameId === game.gameId;
    };

    function joinGame() {
      $rootScope.$broadcast('message', 'Trying to join the game, please wait a moment...',
                            'loading', 'joingame');
      try {
        Chess.joinGame($scope.gameId, $scope.username, {from: $scope.selectedAccount});
      }
      catch(e) {
        $rootScope.$broadcast('message', 'Could not join the game', 'loading', 'joingame');
      }
    }

    $scope.joinGame = function (form) {
      if(form.$valid) {
        joinGame();
      }
    };
  });
