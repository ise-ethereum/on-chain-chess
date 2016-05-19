/* global angular */
angular.module('dappChess')
        .controller('NavigationCtrl', ['$scope', '$route', function ($scope, $route) {
            $scope.games = [];
            $scope.activeGame = null;

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
          }]);
