/* global angular */
angular.module('dappChess', [
  'ngRoute'
])
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider
                    .when('/welcome', {
                      templateUrl: 'welcome.html',
                      controller: 'WelcomeCtrl'
                    })
                    .when('/initializeGame', {
                      templateUrl: 'initializeGame.html',
                      controller: 'InitializeGameCtrl'
                    })
                    .otherwise({redirectTo: '/welcome'});
          }])
        ;
