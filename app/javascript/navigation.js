/* global angular, mist */
angular.module('dappChess').config(function ($routeProvider, $provide) {
  const pages = {
    welcomePage: 'welcome',
    initializeGamePage: 'initializeGame',
    joinGamePage: 'joinGame',
    playGamePage: 'playGame'
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
    .when('/' + pages.welcomePage, {
      templateUrl: pages.welcomePage + '.html',
      controller: 'WelcomeCtrl',
      activePage: pages.welcomePage
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
    .otherwise({redirectTo: '/' + pages.welcomePage});
}).controller('NavigationCtrl', function (accounts, navigation, games, $scope) {
  $scope.games = games.list;

  $scope.navigation = navigation;

  $scope.isMist = false;

  console.log(typeof(mist) === 'undefined' ? 'No mist browser' : 'Mist browser');

  if(typeof(mist) !== 'undefined') {
    $scope.isMist = true;

    console.log('Clearing mist menu');
    mist.menu.clear();

    mist.menu.add(
      'welcome', {
        name: 'Welcome',
        position: 1,
        selected: navigation.isActivePage(navigation.welcomePage)
      }, function() {navigation.goto(navigation.welcomePage);}
    );
    mist.menu.add(
      'initializeGame', {
        name: 'New game',
        position: 2,
        selected: navigation.isActivePage(navigation.initializeGamePage)
      }, function() {navigation.goto(navigation.initializeGamePage);}
    );
    mist.menu.add(
      'joinGame', {
        name: 'Join game',
        position: 3,
        selected: navigation.isActivePage(navigation.joinGamePage)
      }, function() {navigation.goto(navigation.joinGamePage);}
    );

    $scope.$watch('games', function(newGames, oldGames) {
      console.log('games changed');

      let oldGameIds = [];

      for(let i in oldGames) {
        oldGameIds.push(oldGames[i].gameId);
      }

      for(let i in newGames) {
        if(accounts.availableAccounts.indexOf(newGames[i].self.accountId) !== -1 ||
          (typeof(newGames[i].opponent) !== 'undefined' &&
            accounts.availableAccounts.indexOf(newGames[i].opponent.accountId) !== -1
          )
        ) {

          let oldGameIndex = oldGameIds.indexOf(newGames[i].gameId);

          if (oldGameIndex !== -1) {
            oldGameIds.splice(oldGameIndex, 1);
          }


          let menuName =
            (typeof(newGames[i].opponent) !== 'undefined') ?
              newGames[i].opponent.username : 'Open game';

          console.log('Adding menu entry for game with id ' +
            newGames[i].gameId + ' (' + menuName + ')');
          // Since mist menu callbacks don't provide the clicked element, we need to
          // create the callbacks in a loop; thus the JSHint error has to be suppressed
          /*jshint -W083 */
          mist.menu.update(
            newGames[i].gameId, {
              name: menuName,
              position: i + 3,
              selected: navigation.isActiveGame(newGames[i])
            }, function () {
              navigation.goto(navigation.playGamePage, newGames[i].gameId);
            });
          /*jshint +W083 */
        }
      }

      for(let i in oldGameIds) {
        console.log('Removing menu entry for game with id ' + oldGameIds[i]);
        mist.menu.remove(oldGameIds[i]);
      }
    }, true);
  }
});
