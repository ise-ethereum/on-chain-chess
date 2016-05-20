/* global angular */
angular.module('dappChess', ['ngRoute', 'ngAnimate']).config(function ($routeProvider) {
  $routeProvider
    .when('/welcome', {
      templateUrl: 'welcome.html',
      controller: 'WelcomeCtrl',
      activePage: 'welcome'
    })
    .when('/initializeGame', {
      templateUrl: 'initializeGame.html',
      controller: 'InitializeGameCtrl',
      activePage: 'initializeGame'
    })
    .when('/playGame/:id', {
      templateUrl: 'playGame.html',
      controller: 'PlayGameCtrl',
      activePage: 'playGame'
    })
    .otherwise({redirectTo: '/welcome'});
})
;
