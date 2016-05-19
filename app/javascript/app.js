'use strict';

angular.module('dappChess', [
  'ngRoute',
  'dappChess.navigation',
  'dappChess.initializeGame',
  'dappChess.welcome'
])
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider.otherwise({redirectTo: '/welcome'});
          }]);
