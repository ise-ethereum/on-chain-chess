/* global angular */
import {web3, Chess} from '../../contract/Chess.sol';
import {generateState, generateFen} from './utils/fen-conversion.js';
var ChessJS = require('chess.js');
var shhFactory = require('web3-shh-dropin-for-proxy');
var proxyUri = 'http://localhost:8090';
var shhTopic = 'ise-ethereum-chess';

angular.module('dappChess').factory('games', function (crypto, navigation, gameStates,
                                                       accounts, $rootScope, $route) {
  const games = {
    list: [],
    openGames: []
  };

  let shh = shhFactory(proxyUri);

  games.viewingGame = {id: 0};

  games.getGame = function (id) {
    return games.list.find(function (game) {
      return game.gameId === id;
    });
  };

  games.removeGame = function (gameId) {
    for (let i in games.list) {
      if (games.list[i].gameId === gameId) {
        console.log('game removed', games.list.splice(i, 1));
        break;
      }
    }

    gameStates.delete(gameId);
  };

  /**
   * Convert an array to a game object as seen in the contract with the given gameId.
   * @param gameId of the game
   * @param array containing the data
   * @returns object as seen in the contract (contractGameObject)
   */
  games.parseContractGameArray = function (gameId, array) {
    let playerWhite = Chess.getWhitePlayer(gameId);
    return {
      gameId: gameId,
      player1: array[0],
      player2: array[1],
      player1Alias: array[2],
      player2Alias: array[3],
      nextPlayer: array[4],
      winner: array[5],
      ended: array[6],
      pot: array[7],
      player1WonEther: array[8],
      player2WonEther: array[9],
      turnTime: array[10],
      timeoutStarted: array[11],
      timeoutState: array[12],
      playerWhite: playerWhite
    };
  };

  /**
   * Convert a game array to a game for the games list
   * Structure of the game:
   *  gameId: <string>,
   *  {
   *    self: {
   *      username: <string>,
   *      accountId: <string>,
   *      color: <string>,
   *      wonEther: <int>
   *    },
   *    opponent: {
   *      username: <string>,
   *      accountId: <string>,
   *      color: <string>,
   *      wonEther: <int>
   *    }
   *  },
   *  ended: <boolean>,
   *  pot: <number>,
   *  turnTime: <number>,
   *  timeoutStarted: <date>,
   *  timeoutState: <{-2,-1,0,1,2}>
   * @param contractGameObject
   * @returns game
     */
  games.convertGameToObject = function (contractGameObject) {
    let game = {
      gameId: contractGameObject.gameId,
      nextPlayer: contractGameObject.nextPlayer,
      turnTime: contractGameObject.turnTime.toNumber(),
      ended: contractGameObject.ended,
      pot: web3.fromWei(contractGameObject.pot, 'ether').toDigits().toString()
    };

    if (typeof contractGameObject.timeoutState !== 'undefined') {
      game.timeoutState = contractGameObject.timeoutState.toNumber();
      game.timeoutStarted = contractGameObject.timeoutStarted.toNumber() || 0;
    } else {
      game.timeoutState = 0;
      game.timeoutStarted = 0;
    }

    if (accounts.availableAccounts.indexOf(contractGameObject.player2) !== -1) {
      game.self = {
        username: contractGameObject.player2Alias,
        accountId: contractGameObject.player2,
        color: (contractGameObject.playerWhite === contractGameObject.player2 ? 'white' : 'black'),
        wonEther: (contractGameObject.player2WonEther) ?
          web3
            .fromWei(contractGameObject.player2WonEther, 'ether')
            .toDigits().toString() :
          0
      };
      game.opponent = {
        username: contractGameObject.player1Alias,
        accountId: contractGameObject.player1,
        color: (contractGameObject.playerWhite === contractGameObject.player1 ? 'white' : 'black'),
        wonEther: (contractGameObject.player1WonEther) ?
          web3
            .fromWei(contractGameObject.player1WonEther, 'ether')
            .toDigits().toString() :
          0
      };
    } else {
      game.self = {
        username: contractGameObject.player1Alias,
        accountId: contractGameObject.player1,
        color: (contractGameObject.playerWhite === contractGameObject.player1 ? 'white' : 'black'),
        wonEther: (contractGameObject.player1WonEther) ?
          web3
            .fromWei(contractGameObject.player1WonEther, 'ether')
            .toDigits().toString() :
          0
      };
      if (typeof contractGameObject.player2 !== 'undefined' &&
        contractGameObject.player2 !== '0x0000000000000000000000000000000000000000') {
        game.opponent = {
          username: contractGameObject.player2Alias,
          accountId: contractGameObject.player2,
          color: (contractGameObject.playerWhite === contractGameObject.player2 ?
            'white' :
            'black'),
          wonEther: (contractGameObject.player2WonEther) ?
            web3
              .fromWei(contractGameObject.player2WonEther, 'ether')
              .toDigits().toString() :
            0
        };
      }
    }
    if (typeof(contractGameObject.winner) !== 'undefined' &&
      contractGameObject.winner !== '0x0000000000000000000000000000000000000000') {
      if (game.self.accountId === contractGameObject.winner) {
        game.winner = 'self';
      }
      else if (game.opponent.accountId === contractGameObject.winner) {
        game.winner = 'opponent';
      }
    }

    game.ended = contractGameObject.ended;
    game.pot = web3.fromWei(contractGameObject.pot, 'ether').toDigits().toString();

    return game;
  };

  /**
   * Add a game to the list, if there is no game with the same id.
   * @param game A game in the format required for the game list
   */
  games.add = function (game) {
    console.log('game add called', game);

    for(let i in games.list) {
      if (games.list[i].gameId === game.gameId) {
        console.log('game with id ' + game.gameId + ' already exists');
        return;
      }
    }
    games.list.push(game);

    // Initialize chess object
    game.chess = new ChessJS();

    game.state = gameStates.getLastBlockchainState(game);

    let currentFen;
    try {
      let lastLocalState = gameStates.getLastLocalState(game);
      if (lastLocalState) {
        currentFen = generateFen(lastLocalState);
      } else {
        currentFen = generateFen(game.state);
      }
      game.chess.load(currentFen);
    } catch (e) {
      console.log('error while trying to load game state', e);
    }
    if (game.self.color[0] === game.chess.turn()) {
      game.nextPlayer = game.self.accountId;
    } else {
      game.nextPlayer = game.opponent.accountId;
    }

    let lastMoveTime;
    try {
      // Try to find out time of last move
      lastMoveTime = gameStates.getLastMoveTime(game);
      if (!lastMoveTime) {
        // get it from blockchain?
      }
    } catch (e) {
    }
    if (lastMoveTime) {
      game.currentTimeout = new Date(lastMoveTime + game.turnTime * 60 * 1000);
    }

    // Add events for this game
    games.listenForMoves(game, function(m) {
      let [, state, stateSignature, fromIndex, toIndex, moveSignature] = m.payload;

      // Apply move
      let opponentChessMove = game.chess.move({
        from: fromIndex,
        to: toIndex,
        promotion: 'q'
      });

      if (opponentChessMove !== null) {
        game.state = state;
        game.lastMove = opponentChessMove;
        games.sendAck(game);
        gameStates.addOpponentMove(
          game.gameId, fromIndex, toIndex, moveSignature,
          state, stateSignature
        );

        if (game.gameId !== games.viewingGame.id) {
          // Player is currently in another game
          $rootScope.$broadcast('message', game.opponent.username + ' made a move!',
                                'message', 'playgame');
        }
      } else {
        // ToDo: Move is not valid, send last state and move to blockchain
        console.log('Move is not valid, send last state and move to blockchain');
      }
    });

    console.log('added game with id ' + game.gameId);
  };

  /**
   * Add a game to the list, if there is no game with the same id;
   * otherwise update it
   * @param game A game in the format required for the game list
   */
  games.update = function (game) {
    console.log('update game called', game);
    for(let i in games.list) {
      if(games.list[i].gameId === game.gameId) {
        games.list[i] = game;
        console.log('updated game with id ' + game.gameId);
        return;
      }
    }

    games.list.push(game);
    console.log('not existing game added', game);
  };

  games.showWinner = function(game) {
    console.log('show winner', game);
    // Only do this if we are part of this game
    if(accounts.availableAccounts.indexOf(game.self.accountId) !== -1) {
      // Perform actions if game is won
      if(game.winner === 'self') {
        $rootScope.$broadcast('message',
          'You have won the game against ' + game.opponent.username,
          'message', 'playgame');
      }
      // Perform action if the winner was the opponent
      else if(game.winner === 'opponent') {
        $rootScope.$broadcast('message',
          'You have lost the game against ' + game.opponent.username,
          'message', 'playgame');
      }
      else {
        $rootScope.$broadcast('message',
          'Your game against ' + game.opponent.username + ' ended in a draw',
          'message', 'playgame');
      }
    }
    else {
      console.log(game.self.accountId + ' not in account ids', accounts.availableAccounts);
    }
  };

  games.claimWin = function (game) {
    console.log('claimWin', game);
    if (accounts.availableAccounts.indexOf(game.self.accountId) !== -1) {
      if (game.timeoutState !== 0) {
        $rootScope.$broadcast('message',
          'Not able to claim win, while other claim is active in game with the id ' + game.gameId,
          'error', 'claimwin');
      } else {
        $rootScope.$broadcast('message',
          'Claiming win for your game with the id ' + game.gameId,
          'message', 'claimwin');
        try {
          Chess.claimWin(game.gameId, {from: game.self.accountId});
        } catch (e) {
          console.log('claimWin error', e);
          $rootScope.$broadcast('message',
            'Could not claim for a win',
            'error', 'claimwin');
        }
      }
    }
  };

  games.offerDraw = function (game) {
    console.log('offerDraw', game);
    if (accounts.availableAccounts.indexOf(game.self.accountId) !== -1) {
      if (game.timeoutState !== 0) {
        $rootScope.$broadcast('message',
          'Not able to offer draw, while other claim is active in game with the id ' + game.gameId,
          'error', 'offerdraw');
      } else {
        $rootScope.$broadcast('message',
          'Offering draw for your game with the id ' + game.gameId,
          'message', 'offerdraw');
        try {
          Chess.offerDraw(game.gameId, {from: game.self.accountId});
        } catch (e) {
          console.log('offerDraw error', e);
          $rootScope.$broadcast('message',
            'Could not offer a draw',
            'error', 'offerdraw');
        }
      }
    }
  };

  games.claimTimeout = function (game) {
    console.log('offerDraw', game);
    if (accounts.availableAccounts.indexOf(game.self.accountId) !== -1) {
      if (game.timeoutState !== 0) {
        $rootScope.$broadcast('message',
          'Not able to claim timeout, while other claim is active in game with the id ' +
          game.gameId,
          'error', 'claimtimeout');
      } else {
        $rootScope.$broadcast('message',
          'Claim timeout for your game with the id ' + game.gameId,
          'message', 'claimtimeout');
        try {
          Chess.claimTimeout(game.gameId, {from: game.self.accountId});
        } catch (e) {
          console.log('claimTimeout error', e);
          $rootScope.$broadcast('message',
            'Could not claim timeout',
            'error', 'claimtimeout');
        }
      }
    }
  };

  games.confirmGameEnded = function (game) {
    console.log('confirmGameEnded', game);
    if (accounts.availableAccounts.indexOf(game.self.accountId) !== -1) {
      if (game.timeoutState === 0) {
        $rootScope.$broadcast('message',
          'Not able to comfirm game ended, while no claim is active ' +
            'in game with the id ' + game.gameId,
          'error', 'confirmgameended');
      } else {
        $rootScope.$broadcast('message',
          'Sending confirmation to end your game with the id ' + game.gameId,
          'message', 'confirmgameended');
        try {
          Chess.confirmGameEnded(game.gameId, {from: game.self.accountId});
        } catch (e) {
          console.log('confirmGameEnded error', e);
          $rootScope.$broadcast('message',
            'Could not end the game',
            'error', 'confirmgameended');
        }
      }
    }
  };

  games.claimTimeoutEnded = function (game) {
    console.log('claimTimeoutEnded', game);
    if (accounts.availableAccounts.indexOf(game.self.accountId) !== -1) {
      if (game.timeoutState === 0) {
        $rootScope.$broadcast('message',
          'Not able to claim timeout, while no claim is active ' +
            'in game with the id ' + game.gameId,
          'error', 'claimtimeoutended');
      } else {
        $rootScope.$broadcast('message',
          'Claiming timeout for your game with the id ' + game.gameId,
          'message', 'claimtimeoutended');
        try {
          Chess.claimTimeoutEnded(game.gameId, {from: game.self.accountId});
        } catch (e) {
          console.log('claimTimeoutEnded error', e);
          $rootScope.$broadcast('message',
            'Could not claime timeout',
            'error', 'claimtimeoutended');
        }
      }
    }
  };

  games.claimEther = function (game) {
    console.log('claim ether', game);
    // Only do this if we are part of this game
    if (accounts.availableAccounts.indexOf(game.self.accountId) !== -1) {
      // When the player has won ether, claim this
      if (game.self.wonEther > 0) {
        if (game.opponent) {
          $rootScope.$broadcast('message',
            'Claiming your won ether in the game against ' + game.opponent.username,
            'message', 'claimpot');
        }
        else {
          $rootScope.$broadcast('message',
            'Reclaiming your ether in your game with the id ' + game.gameId,
            'message', 'claimpot');
        }

        try {
          console.log('Trying to claim ether for game ', game);
          Chess.withdraw(game.gameId, {from: game.self.accountId});
          $rootScope.$broadcast('message',
            'Your ether with the amount of ' +
            game.self.wonEther +
            ' has been added to your account',
            'success', 'claimpot');

          game.self.wonEther = 0;
          game.pot = 0;
        }
        catch (e) {
          $rootScope.$broadcast('message',
            'Could not claim your ether',
            'error', 'claimpot');
        }
      }
      else {
        console.log('no ether to claim for self: ', game.self);
      }
    }
    else {
      console.log(game.self.accountId + ' not in account ids', accounts.availableAccounts);
    }
  };

  /* Send move and resulting new state to second player */
  games.sendMove = function(game, fromIndex, toIndex) {
    let identity = game.self.accountId;
    let payload = [ 'MOVE', game.state, crypto.sign(identity, game.gameId, game.state),
                   fromIndex, toIndex, crypto.sign(identity, game.gameId, [fromIndex, toIndex])
                  ];
    game.lastSentHash = crypto.solSha3(payload);
    shh.post({
      'from': identity,
      'to': game.opponent.accountId,
      'topic': [shhTopic, game.gameId],
      'payload': payload
    });

    // Wait for ACK
    if (typeof game.ackTimeout !== 'undefined') {
      clearTimeout(game.ackTimeout);
    }
    game.ackTimeout = setTimeout(() => {
      if (game.lastAckHash !== game.lastSentHash) {
        console.log('Opponent did not ACK, sending last state and move to blockchain');
        // If not ACKed, send my last move to blockchain
        try {
          games.sendLastStateOrMoveToBlockchain(game);
          // then send claimTimeout
          Chess.claimTimeout(game.gameId);

          game.moveTimeout = setTimeout(() => {
            // TODO: Get a valid move
            let [fromIndex, toIndex] = [0, 0];
            try {
              Chess.claimTimeoutEndedWithMove(game.gameId, fromIndex, toIndex);
            } catch (e) {
              console.error('Could not claimTimeoutEndedWithMove', e);
            }
          }, game.turnTime * 60 * 1000);
          game.currentTimeout = new Date(new Date().getTime() + game.turnTime * 60 * 1000);
        } catch (e) {
          console.log('Could not send state and move to blockchain', e);
        }
      }
    }, 10000);

    // Wait for next move
    if (typeof game.moveTimeout !== 'undefined') {
      clearTimeout(game.moveTimeout);
    }
    game.moveTimeout = setTimeout(() => {
      console.log('Opponent did not send move, sending' +
                  'last state and move to blockchain');
      // If opponent did not move, send my last state and move to blockchain
      try {
        games.sendLastStateOrMoveToBlockchain(game);
        // then send claimTimeout
        Chess.claimTimeout(game.gameId);

        game.moveTimeout = setTimeout(() => {
          // TODO: Get a valid move
          let [fromIndex, toIndex] = [0, 0];
          try {
            Chess.claimTimeoutEndedWithMove(game.gameId, fromIndex, toIndex);
          } catch (e) {
            console.error('Could not claimTimeoutEndedWithMove', e);
          }
        }, game.turnTime/2 * 60 * 1000 + 10000); // half game time plus 10 seconds extra
        game.currentTimeout = new Date(new Date().getTime() + game.turnTime * 60 * 1000);
      } catch (e) {
        console.log('Could not send state and move to blockchain', e);
      }
    }, game.turnTime/2 * 60 * 1000); // half game time
    game.currentTimeout = new Date(new Date().getTime() + game.turnTime * 60 * 1000);
    $rootScope.$apply();
  };

  games.sendLastStateOrMoveToBlockchain = function (game) {
    let state, stateSignature, fromIndex, toIndex;
    try {
      [state, stateSignature, fromIndex, toIndex] = gameStates.getLastMovePackage(game.gameId);
    } catch (e) {
      // last state + move not present, move base on blockchain state
      let lastSelfMove = gameStates.getLastSelfMove(game.gameId);
      if (gameStates.getMoveNumberFromState(gameStates.getLastBlockchainState(game)) + 1 ===
            gameStates.getMoveNumberFromState(lastSelfMove.newState)) {
        Chess.move(game.gameId, lastSelfMove.moveFrom, lastSelfMove.moveTo);
      } else {
        // should not happen
        throw Error('Blockchain state and local move do not match.');
      }
      return;
    }
    Chess.moveFromState(game.gameId, state, fromIndex, toIndex, stateSignature);
  };

  /* Send acknowledgment of last received move */
  games.sendAck = function(game) {
    console.log('Acknowledge reception of', game.lastReceivedHash);
    shh.post({
      'from': game.self.accountId,
      'to': game.opponent.accountId,
      'topic': [shhTopic, game.gameId],
      'payload': ['ACK', game.lastReceivedHash]
    });
  };

  /* Receive move and resulting new state from opponent */
  /* callback({[state, stateSignature, fromIndex, toIndex, moveSignature], from}) */
  games.listenForMoves = function(game, callback) {
    // Register is only needed for Fake-SHH. Remove this line for real Whisper
    shh.register(game.self.accountId);

    let moveEvents = shh.watch({
      'topic': [shhTopic, game.gameId],
      'to': game.self.accountId
    });
    moveEvents.arrived(function(m) {
      console.log('moveEvents.arrived', m);
      if (m.payload[0] === 'ACK') {
        let hash = m.payload[1];
        game.lastAckHash = hash;
        console.log('Received acknowledgment of', hash);
      }
      if (m.payload[0] === 'MOVE') {
        let [, state, stateSignature, fromIndex, toIndex, moveSignature] = m.payload;
        if (!crypto.verify(game.opponent.accountId, game.gameId, stateSignature, state) ||
            !crypto.verify(game.opponent.accountId, game.gameId, moveSignature,
              [fromIndex, toIndex])) {
          console.log('Could not verify opponent\'s move signature, sending last ' +
                      'valid state and move to blockchain');
          // TODO Send my last known state and move to the blockchain

        } else {
          game.lastReceivedHash = crypto.solSha3(m.payload);
          game.currentTimeout = new Date(new Date().getTime() + game.turnTime * 60 * 1000);
          callback(m);
        }
      }
    });

    return {
      stopListening: () => {
        moveEvents.remove();
      }
    };
  };

  games.eventGameInitialized = function (err, data) {
    console.log('eventGameInitialized', err, data);
    if (err) {
      console.log('error occured', err);
      /*$rootScope.$broadcast('message',
       'Your game could not be created, the following error occured: ' + err,
       'error', 'startgame');*/
    } else {
      let game = games.convertGameToObject(data.args);
      games.add(game);
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
        game = games.convertGameToObject(data.args);
        games.add(game);
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
        game.pot = web3.fromWei(data.args.pot, 'ether').toDigits().toString();
        game.player1WonEther = 0;
        game.player2WonEther = 0;
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
    let game = games.getGame(data.args.gameId);
    if (typeof game !== 'undefined') {
      if (game.timeoutState !== 0) {
        game.timeoutState = 0;
      }
      if (game.self.accountId === data.args.player) {
        game.nextPlayer = game.opponent.accountId;
      } else {
        game.nextPlayer = game.self.accountId;
      }

      $rootScope.$apply();
    }
  };

  games.eventGameEnded = function (err, data) {
    console.log('eventGameEnded', err, data);
    if (err) {
      console.log('error occured', err);
      /* $rootScope.$broadcast('message',
       'The surrender could not be saved, the following error occurred: ' + err,
       'error', 'playgame');*/
    } else {
      // Update game in games list
      let gameInContract = Chess.games(data.args.gameId);

      if (gameInContract) {
        for (let i in games.list) {
          if (games.list[i].gameId === data.args.gameId) {
            let game = games.convertGameToObject(
              games.parseContractGameArray(data.args.gameId, gameInContract)
            );
            console.log('updated game after close', game);
            games.update(game);

            // Show the winner of the game
            games.showWinner(game);

            // Claim the ether automatically
            games.claimEther(game);

            $rootScope.$apply();
          }
        }
      }
    }
  };

  games.eventGameClosed = function(err, data) {
    console.log('eventGameClosed', err, data);
    if (err) {
      console.log('error occured', err);
      /*$rootScope.$broadcast('message',
       'The surrender could not be saved, the following error occurred: ' + err,
       'error', 'playgame');*/
    } else {
      // Update game in games list
      let gameInContract = Chess.games(data.args.gameId);

      if(gameInContract) {
        for(let i in games.list) {
          if (games.list[i].gameId === data.args.gameId) {
            let game = games.convertGameToObject(
              games.parseContractGameArray(data.args.gameId, gameInContract
            ));
            games.update(game);

            // If the player closed his own game
            if (accounts.availableAccounts.indexOf(data.args.player) !== -1) {
              navigation.goto(navigation.welcomePage);

              $rootScope.$broadcast('message',
                'Your game with the id ' + data.args.gameId + ' was closed',
                'success', 'playgame');

              // If the game did not have an opponent: Claim the ether from this game
              if (typeof(game.opponent) === 'undefined') {
                games.claimEther(game);
              }

              games.removeGame(data.args.gameId);

              $rootScope.$apply();
            }
            else {
              let openGameIndex = games.openGames.indexOf(game.gameId);

              // If this was an open game of another player
              if (openGameIndex !== -1) {
                games.removeGame(data.args.gameId);
                games.openGames.splice(openGameIndex, 1);

                $rootScope.$apply();
              }
            }
          }
        }
      }
    }
  };

  games.eventGameTimeoutStarted = function (err, data) {
    console.log('eventGameTimeoutStarted', err, data);
    if (err) {
      console.error('error occured', err);
      return;
    }
    let game = games.getGame(data.args.gameId);
    if (typeof game === 'undefined') {
      return;
    }
    game.timeoutStarted = data.args.timeoutStarted.toNumber();
    game.timeoutState = data.args.timeoutState.toNumber();

    /*
     * -2 draw offered by nextPlayer
     * -1 draw offered by waiting player
     * 0 nothing
     * 1 checkmate
     * 2 timeout
     */
    if((game.timeoutState === -1 && game.nextPlayer === game.self.accountId) ||
      (game.timeoutState === -2 && game.nextPlayer === game.opponent.accountId)) {
      $rootScope.$broadcast('message',
        'Player ' + game.opponent.username + ' wants to offer a draw',
        'message', 'playgame-' + game.gameId);
    }
    if(game.timeoutState === 1 && game.nextPlayer === game.self.accountId) {
      $rootScope.$broadcast('message',
        'Player ' + game.opponent.username + ' claims that he won the game',
        'message', 'playgame-' + game.gameId);
    }
    if(game.timeoutState === 2 && game.nextPlayer === game.self.accountId) {
      $rootScope.$broadcast('message',
        'Player ' + game.opponent.username + ' claims that he won the game due to a timeout',
        'message', 'playgame-' + game.gameId);
    }

    $rootScope.$apply();

    // Check own state to confirm or decline
    if ((game.chess.turn() === 'w' && game.self.color === 'white' && data.args.timeoutState !== 0) ||
        (game.chess.turn() === 'b' && game.self.color === 'black' && data.args.timeoutState !== 0)) {
      if (
          ([1, 2].indexOf(data.args.timeoutState) !== -1 && game.chess.in_checkmate()) || // jshint ignore:line
          (data.args.timeoutState === -1 && (game.chess.in_stalemate() || game.chess.in_draw())) // jshint ignore:line
        ) {
        try {
          Chess.confirmGameEnded(game.gameId, {from: game.self.accountId});
        } catch (e) {
          $rootScope.$broadcast('message',
            'Could not confirm your game against ' + game.opponent.username + ' ended',
            'error', 'playgame-' + game.gameId);
          console.log('error while trying to confirm the game ended after draw', e);
        }
      } else { // no valid endgame
        try {
          games.sendLastStateOrMoveToBlockchain(game);
        } catch (e) {
          $rootScope.$broadcast('message',
            'Could not send move to blockchain to decline endgame',
            'error', 'playgame-' + game.gameId);
          console.log('Could not send move to blockchain to decline endgame', e);
        }
      }

      $rootScope.$apply();
    } else if (data.args.timeoutState === -2 &&
      (game.chess.in_stalemate() || game.chess.in_draw()) && ( // jshint ignore:line
        (game.chess.turn() === 'w' && game.self.color === 'black') ||
        (game.chess.turn() === 'b' && game.self.color === 'white')
      )
    ) { // opponent (currently turning player) offers draw
      try {
        Chess.confirmGameEnded(game.gameId, {from: game.self.accountId});
      } catch (e) {
        $rootScope.$broadcast('message',
          'Could not confirm your game against ' + game.opponent.username + ' ended',
          'error', 'playgame-' + game.gameId);
        console.error('error while trying to confirm the game ended after draw', e);
      }
    }
  };

  // Fetch games of player
  for (let accountId of accounts.availableAccounts) {
    for (let currentGameId of Chess.getGamesOfPlayer(accountId)) {
      // Check if the game already exists in the games list
      let game = games.getGame(currentGameId);
      if (typeof game === 'undefined') {
        games.add(
          games.convertGameToObject(
            games.parseContractGameArray(currentGameId, Chess.games(currentGameId))
        ));
      }
    }
  }

  // Fetch open games
  for (let openGameId of Chess.getOpenGameIds()) {
    // Check if the game already exists in the games list
    let game = games.getGame(openGameId);
    if (typeof game === 'undefined') {
      games.add(
        games.convertGameToObject(
          games.parseContractGameArray(openGameId, Chess.games(openGameId))
        ));
    }
    if(games.openGames.indexOf(openGameId) === -1) {
      games.openGames.push(openGameId);
    }
    if(games.openGames.indexOf(openGameId) === -1) {
      games.openGames.push(openGameId);
    }
  }


  // Event listeners
  Chess.GameInitialized({}, games.eventGameInitialized);
  Chess.GameJoined({}, games.eventGameJoined);
  Chess.GameStateChanged({}, games.eventGameStateChanged);
  Chess.Move({}, games.eventMove);
  Chess.GameEnded({}, games.eventGameEnded);
  Chess.GameClosed({}, games.eventGameClosed);
  Chess.GameTimeoutStarted({}, games.eventGameTimeoutStarted);

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
