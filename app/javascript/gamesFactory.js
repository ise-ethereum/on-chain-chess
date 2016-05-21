/* global angular, inArray, escape */
import {web3, Chess} from '../../contract/Chess.sol';
angular.module('dappChess').factory('games', function ($rootScope) {
  const games = {list: []};
  /*
   * Structure of games list:
   * [
   *  {
   *    self: {
   *      username: <string>,
   *      accountId: <string>,
   *      color: <string>
   *    },
   *    opponent: {
   *      username: <string>,
   *      accountId: <string>,
   *      color: <string>
   *    },
   *    gameId: <string>
   *  }
   * ]
   */

  games.eventGameInitialized = function (err, data) {
    console.log('eventGameInitialized', err, data);
    if (err) {
      $rootScope.$broadcast('message',
        'Your game could not be created, the following error occured: ' + err,
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
    if (err) {
      $rootScope.$broadcast('message',
        'It was not possible to join the game, the following error occured: ' + err,
        'error', 'joingame');
    } else {
      const gameId = data.args.gameId;
      const p1accountId = data.args.player1;
      const p1username = data.args.player1Alias;
      const p1color = 'white';
      const p2accountId = data.args.player2;
      const p2username = data.args.player2Alias;
      const p2color = 'black';

      let opponentName;

      if (inArray(p1accountId, web3.eth.accounts)) {
        opponentName = p2username;

        games.list.push({
          self: {
            username: p1username,
            accountId: p1accountId,
            color: p1color
          },
          opponent: {
            username: p2username,
            accountId: p2accountId,
            color: p2color
          },
          gameId: gameId
        });
      } else {
        opponentName = p1username;

        games.list.push({
          opponent: {
            username: p1username,
            accountId: p1accountId,
            color: p1color
          },
          self: {
            username: p2username,
            accountId: p2accountId,
            color: p2color
          },
          gameId: gameId
        });
      }


      $rootScope.$broadcast('message',
        'Your game against ' + escape(opponentName) + ' has started',
        'success', 'joingame');
      $rootScope.$apply();
    }
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
