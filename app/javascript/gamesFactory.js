/* global angular */
import {Chess} from '../../contract/Chess.sol';
angular.module('dappChess').factory('games', function (navigation, accounts, $rootScope, $route) {
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

    if (accounts.availableAccounts.indexOf(contractGameObject.player2) !== -1) {
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
    if(typeof(contractGameObject.winner) !== 'undefined' &&
      contractGameObject.winner !== '0x0000000000000000000000000000000000000000') {
      if(game.self.accountId === contractGameObject.winner) {
        game.winner = 'self';
      }
      else if(game.opponent.accountId === contractGameObject.winner) {
        game.winner = 'opponent';
      }
    }

    games.list.push(game);

    return game;
  };

  games.setWinner = function(gameId, winnerAccountId) {
    for(let i in games.list) {
      if(games.list[i].gameId === gameId) {
        if(games.list[i].self.accountId === winnerAccountId) {
          games.list[i].winner = 'self';

          console.log(accounts.availableAccounts, winnerAccountId,
                      accounts.availableAccounts.indexOf(winnerAccountId) !== -1);
          if (accounts.availableAccounts.indexOf(winnerAccountId) !== -1) {
            $rootScope.$broadcast('message',
              'You have won the game against ' + games.list[i].opponent.username,
              'message', 'playgame');
          }
        }
        else if(games.list[i].opponent.accountId === winnerAccountId) {
          games.list[i].winner = 'opponent';

          console.log(accounts.availableAccounts, games.list[i].self.accountId,
                      accounts.availableAccounts.indexOf(games.list[i].self.accountId) !== -1);
          if (accounts.availableAccounts.indexOf(games.list[i].self.accountId) !== -1) {
            $rootScope.$broadcast('message',
              'You have lost the game against ' + games.list[i].opponent.username,
              'message', 'playgame');
          }
        }
        else {
          console.log('error: could not find winner ' + winnerAccountId,
            'self: ' + games.list[i].self.accountId,
            'opponent: ' + games.list[i].opponent.accountId
          );
        }

        $rootScope.$apply();

        break;
      }
    }
  };

  games.eventGameInitialized = function (err, data) {
    console.log('eventGameInitialized', err, data);
    if (err) {
      console.log('error occured', err);
      /*$rootScope.$broadcast('message',
        'Your game could not be created, the following error occured: ' + err,
        'error', 'startgame');*/
    } else {
      let game = games.add(data.args);
      games.openGames.push(game.gameId);

      if (accounts.availableAccounts.indexOf(game.self.accountId) !== -1) {
        $rootScope.$broadcast('message',
          'Your game has successfully been created and has the id ' + game.gameId,
          'success', 'startgame');
      }

      $rootScope.$apply();
    }
  };

  games.eventGameJoined = function (err, data) {
    console.log('eventGameJoined', err, data);
    if (err) {
      console.log('error occured', err);
      /*$rootScope.$broadcast('message',
        'It was not possible to join the game, the following error occured: ' + err,
        'error', 'joingame');*/
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
        // remove game from openGames
        let gameIndex = games.openGames.indexOf(gameId);
        games.openGames.splice(gameIndex, 1);
        if (accounts.availableAccounts.indexOf(p2accountId) !== -1) {
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

      if (accounts.availableAccounts.indexOf(game.self.accountId) !== -1) {
        $rootScope.$broadcast('message', 'Your game against ' +
                game.opponent.username.replace(/<(?:.|\n)*?>/gm, '') +
                ' has started',
            'success', 'joingame');

        if($route.current.activePage === navigation.joinGamePage) {
          navigation.goto(navigation.playGamePage, gameId);
        }
        else {
          $rootScope.$apply();
        }
      }
    }
  };

  games.eventGameStateChanged = function (err, data) {
    console.log('eventGameStateChanged', err, data);
  };

  games.eventMove = function (err, data) {
    console.log('eventMove', err, data);
  };

  games.eventGameEnded = function(err, data) {
    console.log('eventGameEnded', err, data);
    if (err) {
      console.log('error occured', err);
      /*$rootScope.$broadcast('message',
        'The surrender could not be saved, the following error occurred: ' + err,
        'error', 'playgame');*/
    } else {
      games.setWinner(data.args.gameId, data.args.winner);
    }
  };

  // Fetch games of player
  const gamesOfPlayersEnd = '0x0000000000000000000000000000000000000000000000000000000000000000';
  for (let accountId of accounts.availableAccounts) {
    for (let currentGameId = Chess.gamesOfPlayersHeads(accountId);
         currentGameId !== gamesOfPlayersEnd;
         currentGameId = Chess.gamesOfPlayers(accountId, currentGameId)) {
      // Check if the game already exists in the games list
      let game = games.getGame(currentGameId);
      if (typeof game === 'undefined') {
        games.add(games.convertArrayToGame(currentGameId, Chess.games(currentGameId)));
      }
    }
  }

  // Fetch open games
  const end = '0x656e640000000000000000000000000000000000000000000000000000000000';
  for (let currentGameId = Chess.head();
       currentGameId !== end;
       currentGameId = Chess.openGameIds(currentGameId)) {
    // Check if the open game already exists in the games list
    let game = games.getGame(currentGameId);
    if (typeof game === 'undefined') {
      games.add(games.convertArrayToGame(currentGameId, Chess.games(currentGameId)));
    }
    games.openGames.push(currentGameId);
  }


  // Event listeners
  Chess.GameInitialized({}, games.eventGameInitialized);
  Chess.GameJoined({}, games.eventGameJoined);
  Chess.GameStateChanged({}, games.eventGameStateChanged);
  Chess.Move({}, games.eventMove);
  Chess.GameEnded({}, games.eventGameEnded);

  return games;
}).filter('ownGames', function (accounts) {
  return function (games) {
    return games.filter(function (game) {
      return accounts.availableAccounts.indexOf(game.self.accountId) !== -1;
    });
  };
}).filter('othersOpenGames', function (accounts) {
  return function (games, openGames) {
    if (typeof games !== 'undefined') {
      return games.filter(function (game) {
        return accounts.availableAccounts.indexOf(game.self.accountId) === -1;
      }).filter(function(game) {
        return openGames.indexOf(game.gameId) !== -1;
      });
    }
  };
});
