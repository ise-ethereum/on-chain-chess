/* global angular, inArray, escape */
import {web3, Chess} from '../../contract/Chess.sol';
angular.module('dappChess').factory('games', function ($rootScope) {
  const games = {
    list: [],
    openGames: []
  };
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
   *    }
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
      playerWhite: array[5],
      winner: array[6],
      state: array[7]
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
    let game = { gameId: contractGameObject.gameId };

    if (inArray(contractGameObject.p2accountId, web3.eth.accounts)) {
      game.self = {
        username: contractGameObject.player2Alias,
        accountId: contractGameObject.player2,
        color: (contractGameObject.playerWhite === contractGameObject.player2 ? 'white' : 'black')
      };
      game.opponent = {
        username: contractGameObject.player1Alias,
        accountId: contractGameObject.player1,
        color: (contractGameObject.playerWhite === contractGameObject.player1 ? 'white' : 'black')
      };
    } else {
      game.self = {
        username: contractGameObject.player1Alias,
        accountId: contractGameObject.player1,
        color: (contractGameObject.playerWhite === contractGameObject.player1 ? 'white' : 'black')
      };
      if (typeof contractGameObject.player2 !== 'undefined' &&
          contractGameObject.player2 !== '0x0000000000000000000000000000000000000000') {
        game.opponent = {
          username: contractGameObject.player2Alias,
          accountId: contractGameObject.player2,
          color: (contractGameObject.playerWhite === contractGameObject.player2 ? 'white' : 'black')
        };
      }
    }
    games.list.push(game);
    return game;
  };

  games.eventGameInitialized = function (err, data) {
    console.log('eventGameInitialized', err, data);
    if (err) {
      console.log('error occured', err);
      $rootScope.$broadcast('message',
        'Your game could not be created, the following error occured: ' + err,
        'error', 'startgame');
    } else {
      let game = games.add(data.args);
      games.openGames.push(game);

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
      console.log('error occured', err);
      $rootScope.$broadcast('message',
        'It was not possible to join the game, the following error occured: ' + err,
        'error', 'joingame');
    } else {
      let gameId = data.args.gameId;
      let p1accountId = data.args.player1;
      let p1username = data.args.player1Alias;
      let p1color = (data.args.playerWhite === data.args.player1 ? 'white' : 'black');
      let p2accountId = data.args.player2;
      let p2username = data.args.player2Alias;
      let p2color = (data.args.playerWhite === data.args.player2 ? 'white' : 'black');

      let game = games.getGame(gameId);
      if (typeof game === 'undefined') {
        game = games.add(data.args);
      } else {
        for (let i in games.openGames) {
          if (games.openGames[i].gameId === gameId) {
            games.openGames.splice(i, 1);
            break;
          }
        }
        if (inArray(p2accountId, web3.eth.accounts)) {
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

  // Fetch games of player
  for (let accountId of web3.eth.accounts) {
    let numberGames = Chess.numberGamesOfPlayers(accountId);
    if (numberGames === 0) {
      return;
    }
    for (let i = 0; i < numberGames; i++) {
      let gameId = Chess.gamesOfPlayers(accountId, i);
      games.add(games.convertArrayToGame(gameId, Chess.games(gameId)));
    }
  }

  // Fetch open games
  const end = '0x656e640000000000000000000000000000000000000000000000000000000000';
  for (let x = Chess.head(); x !== end; x = Chess.openGameIds(x)) {
    let g = Chess.games(x);
    if (typeof g !== 'undefined') {
      games.openGames.push(g);
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
