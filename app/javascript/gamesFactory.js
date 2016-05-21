/* global angular, inArray, escape */
import {web3, Chess} from '../../contract/Chess.sol';
angular.module('dappChess').factory('games', function ($rootScope) {
  const games = {list: []};
  /*
   * Structure of games list:
   * [
   *  gameId: <string>,
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
   *  }
   * ]
   */

  games.getGame = function (id) {
    return games.list.find(function (game) {
      return game.gameId === id;
    });
  };

  /**
   * Convert an array to a game object as seen in the contract with the given gameId.
   * @param gameId of the game
   * @param array containing the data
   * @returns object as seen in the contract
   */
  games.convertArrayToGame = function (gameId, array) {
    return {
      gameId: gameId,
      player1: array[0],
      player2: array[1],
      player1Alias: array[2],
      player2Alias: array[3],
      nextPlayer: array[4],
      winner: array[5],
      state: array[6]
    };
  };

  /**
   * Add a game to the list, if there is no game with the same id.
   * @param contractGameObject An object with the structure of a Game in the contract<br>
   *     { player1: "<address>", player2: "<address>", ... }
   * @returns the new created game or undefined, if the gameId is already in the list
   */
  games.add = function (contractGameObject) {
    if (typeof games.getGame(contractGameObject.gameId) !== 'undefined') {
      return;
    }
    var game = { gameId: contractGameObject.gameId };

    if (inArray(contractGameObject.p2accountId, web3.eth.accounts)) {
      game.self = {
        username: contractGameObject.player2Alias,
        accountId: contractGameObject.player2,
        color: 'black'
      };
      game.opponent = {
        username: contractGameObject.player1Alias,
        accountId: contractGameObject.player1,
        color: 'white'
      };
    } else {
      game.self = {
        username: contractGameObject.player1Alias,
        accountId: contractGameObject.player1,
        color: 'white'
      };
      if (contractGameObject.player2 !== '0x0000000000000000000000000000000000000000') {
        game.opponent = {
          username: contractGameObject.player2Alias,
          accountId: contractGameObject.player2,
          color: 'black'
        };
      }
    }
    games.list.push(game);
    return game;
  };

  games.eventGameInitialized = function (err, data) {
    console.log('eventGameInitialized', err, data);
    if (err) {
      $rootScope.$broadcast('message',
        'Your game could not be created, the following error occured: ' + err,
        'error', 'startgame');
    } else {
      let game = games.add(data.args);

      if (inArray(game.self.accountId, web3.eth.accounts)) {
        $rootScope.$broadcast('message',
          'Your game has successfully been created and has the id ' + game.gameId,
          'success', 'startgame');
        $rootScope.$apply();
      }
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

      let game = games.getGame(gameId);
      if (typeof game === 'undefined') {
        game = games.add(data.args);
      } else if (inArray(p2accountId, web3.eth.accounts)) {
        game.self = {
          username: p2username,
          accountId: p2accountId,
          color: p2color
        };
        game.opponent = {
          username: p1username,
          accountId: p1accountId,
          color: p1color
        };
      } else {
        game.self = {
          username: p1username,
          accountId: p1accountId,
          color: p1color
        };
        game.opponent = {
          username: p2username,
          accountId: p2accountId,
          color: p2color
        };
      }

      if (inArray(game.self.accountId, web3.eth.accounts)) {
        $rootScope.$broadcast('message',
          'Your game against ' + escape(game.opponent.username) + ' has started',
          'success', 'joingame');
        $rootScope.$apply();
      }
    }
  };

  games.eventGameStateChanged = function (err, data) {
    console.log('eventGameStateChanged', err, data);
  };

  games.eventMove = function (err, data) {
    console.log('eventMove', err, data);
  };

  for (let accountId of web3.eth.accounts) {
    const numberGames = Chess.numberGamesOfPlayers(accountId);
    if (numberGames === 0) {
      return;
    }
    for (let i = 0; i < numberGames; i++) {
      let gameId = Chess.gamesOfPlayers(accountId, i);
      games.add(games.convertArrayToGame(gameId, Chess.games(gameId)));
    }
  }

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
