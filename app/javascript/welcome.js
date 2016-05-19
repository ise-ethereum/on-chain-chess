'use strict';

angular.module('dappChess.welcome', ['ngRoute'])

        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider.when('/welcome', {
              templateUrl: 'welcome.html',
              controller: 'WelcomeCtrl'
            });
          }])

        .controller('WelcomeCtrl', [function () {

          }]);
