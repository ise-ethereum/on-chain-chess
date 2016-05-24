/* global angular, inArray */
angular.module('dappChess').controller('PlayGameCtrl', function (games, $route, $scope) {
  function checkOpenGame(gameId) {
    return inArray(gameId, games.openGames);
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
});
