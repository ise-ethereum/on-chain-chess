/* global angular */
import {Chess} from '../../contract/Chess.sol';
angular.module('dappChess').controller('PlayGameCtrl',
  function (games, $route, $scope, $rootScope) {
    function checkOpenGame(gameId) {
      return games.openGames.indexOf(gameId) !== -1;
    }

    $scope.getGameId = function() {
      return $route.current.params.id;
    };
    $scope.isOpenGame = function() {
      let gameId = $scope.getGameId();

      if(gameId) {
        return checkOpenGame(gameId);
      }

      return false;
    };
    $scope.getGame = function() {
      let gameId = $scope.getGameId();

      if(gameId) {
        return games.getGame(gameId);
      }

      return false;
    };
    $scope.surrender = function() {
      $rootScope.$broadcast('message', 'Submitting your surrender, please wait...',
        'loading', 'playgame');
      try {
        console.log('calling Chess.surrender(' + $scope.getGameId() + ')');
        Chess.surrender($scope.getGameId());
      }
      catch(e) {
        $rootScope.$broadcast('message', 'Could not submit your surrender', 'loading', 'playgame');
      }
    };
  }
);
