/* global angular, inArray */
import {web3, Chess} from '../../contract/Chess.sol';
angular.module('dappChess').factory('games', function ($rootScope) {
  const games = {list: []};

  // mock
  games.list.push(
    {
      self: {
        username: 'chessmouse72',
        accountId: web3.eth.accounts[0],
        color: 'white'
      },
      opponent: {
        username: 'mops23',
        accountId: '0x567890',
        color: 'black'
      },
      gameId: '123456789'
    },
    {
      self: {
        username: 'chessmouse72',
        accountId: web3.eth.accounts[0],
        color: 'black'
      },
      opponent: {
        username: 'mickey53',
        accountId: '0x67890',
        color: 'white'
      },
      gameId: '987654321'
    }
  );

  games.eventGameInitialized = function (err, data) {
    console.log('eventGameInitialized', err, data);
    if (err) {
      $rootScope.$broadcast('message',
        'Your game could not be created, the following error occures: ' + err,
        'error', 'startgame');
    }
    else {
      const gameId = data.args.gameId;
      const accountId = data.args.player1;
      const username = data.args.player1Alias;
      const color = 'white';

      games.list.push({
        self: {
          username: username,
          accountId: accountId,
          color: color
        },
        gameId: gameId
      });

      $rootScope.$broadcast('message',
        'Your game has successfully been created and has the id ' + gameId,
        'success', 'startgame');
      $rootScope.$apply();
    }
  };

  games.eventGameJoined = function (err, data) {
    console.log('eventGameJoined', err, data);
  };

  games.eventGameStateChanged = function (err, data) {
    console.log('eventGameStateChanged', err, data);
  };

  games.eventMove = function (err, data) {
    console.log('eventMove', err, data);
  };

  // Event listeners
  Chess.GameInitialized({}, games.eventGameInitialized);
  Chess.GameJoined({}, games.eventGameJoined);
  Chess.GameStateChanged({}, games.eventGameStateChanged);
  Chess.Move({}, games.eventMove);

  return games;
}).filter('ownGames', function () {
  return function (games) {
    if (typeof games !== 'undefined')
      return games.filter(function (game) {
        return inArray(game.self.accountId, web3.eth.accounts);
      });
  };
});
