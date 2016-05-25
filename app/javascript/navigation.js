/* global angular */
angular.module('dappChess').config(function ($routeProvider, $provide) {
  const pages = {
    playGamePage: 'playGame',
    joinGamePage: 'joinGame',
    initializeGamePage: 'initializeGame'
  };

  $provide.factory('navigation', function ($route) {
    let navigation = pages;
    
    navigation.isActivePage = function (page) {
      if(typeof ($route.current) !== 'undefined') {
        return page === $route.current.activePage;
      }
    };

    navigation.isActiveGame = function (game) {
      if(typeof ($route.current) !== 'undefined' &&
              typeof ($route.current.params.id) !== 'undefined') {
        return $route.current.activePage === navigation.playGamePage &&
                game.gameId === $route.current.params.id;
      }
    };

    navigation.goto = function(page, parameter) {
      if(parameter) {
        window.location = '#/' + page + '/' + parameter; 
      }
      else {
        window.location = '#/' + page;
      }
    };

    return navigation;
  });
  
  $routeProvider
    .when('/welcome', {
      templateUrl: 'welcome.html',
      controller: 'WelcomeCtrl',
      activePage: 'welcome'
    })
    .when('/' + pages.initializeGamePage, {
      templateUrl: pages.initializeGamePage + '.html',
      controller: 'InitializeGameCtrl',
      activePage: pages.initializeGamePage
    })
    .when('/' + pages.joinGamePage, {
      templateUrl: pages.joinGamePage + '.html',
      controller: 'JoinGameCtrl',
      activePage: pages.joinGamePage
    })
    .when('/' + pages.playGamePage + '/:id', {
      templateUrl: pages.playGamePage + '.html',
      controller: 'PlayGameCtrl',
      activePage: pages.playGamePage
    })
    .otherwise({redirectTo: '/welcome'});
});