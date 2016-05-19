/* global angular */
angular.module('dappChess')
        .controller('NavigationCtrl', ['$scope', function ($scope) {
            $scope.activePage = null;

            $scope.games = [];

            $scope.mock = function () {
              $scope.games = [
                {
                  username: 'chessmouse72',
                  gameid: '123456789'
                },
                {
                  username: 'mickey53',
                  gameid: '987654321'
                }
              ];
              $scope.activePage = $scope.games[1].gameid;
            };

            $scope.mock();

            $scope.isActivePage = function (page) {
              return page === $scope.activePage;
            };

            $scope.isActiveGame = function (game) {
              return game.gameid === $scope.activePage;
            };

            $scope.setActiveGame = function (game) {
              $scope.activePage = game.gameid;
            };
          }]);
