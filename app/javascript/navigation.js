/* global angular */
angular.module('dappChess').controller('NavigationCtrl', function (games, $scope, $route) {
  $scope.games = games.list;
  $scope.activeGame = null;

  $scope.isActivePage = function (page) {
    if(typeof ($route.current) !== 'undefined') {
      return page === $route.current.activePage;
    }
  };

  $scope.isActiveGame = function (game) {
    if(typeof ($route.current) !== 'undefined' &&
            typeof ($route.current.params.id) !== 'undefined') {
      return $route.current.activePage === 'playGame' &&
              game.gameid === $route.current.params.id;
    }
  };

  $scope.setActiveGame = function (game) {
    $scope.activeGame = game.gameid;
  };
});
