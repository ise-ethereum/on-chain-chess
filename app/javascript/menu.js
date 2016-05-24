/* global angular */
angular.module('dappChess').controller('MenuCtrl', function (navigation, games, $scope) {
  $scope.games = games.list;

  $scope.navigation = navigation;
});
