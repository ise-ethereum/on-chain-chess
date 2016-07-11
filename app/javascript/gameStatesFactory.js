/* global angular */
import {Chess} from '../../contract/Chess.sol';
angular.module('dappChess').factory('gameStates', function () {
  let gameStates = {
    selfMoves: {},
    opponentMoves: {},
    lastMoveNumber: {}
  };

  gameStates.getMoveNumberFromState = function(state) {
    return state[8] * 128 + state[9];
  };

  gameStates.initializeGame = function(gameId) {
    if(typeof(gameStates.selfMoves[gameId]) === 'undefined') {
      gameStates.selfMoves[gameId] = [];
    }
    if(typeof(gameStates.opponentMoves[gameId]) === 'undefined') {
      gameStates.opponentMoves[gameId] = [];
    }
    if(typeof(gameStates.lastMoveNumber[gameId]) === 'undefined') {
      gameStates.lastMoveNumber[gameId] = 0;
    }
  };

  gameStates.addSelfMove = function(gameId, moveFrom, moveTo, newState) {
    gameStates.initializeGame(gameId);

    let moveNumber = gameStates.getMoveNumberFromState(newState);

    // If we already stored this move, don't do anything
    if(gameStates.lastMoveNumber[gameId] === moveNumber) {
      return;
    }
    if(gameStates.lastMoveNumber[gameId] > moveNumber) {
      throw 'Invalid move: The last store move number is higher';
    }

    gameStates.selfMoves[gameId].push({
      moveFrom: moveFrom,
      moveTo: moveTo,
      newState: newState
    });
    gameStates.lastMoveNumber[gameId] = moveNumber;

    gameStates.updateLocalStorage();
  };
  gameStates.addOpponentMove = function(gameId, moveFrom, moveTo,
                                        moveSignature, newState, newStateSignature) {
    gameStates.initializeGame(gameId);

    let moveNumber = gameStates.getMoveNumberFromState(newState);

    // If we already stored this move, don't do anything
    if(gameStates.lastMoveNumber[gameId] === moveNumber) {
      return;
    }
    if(gameStates.lastMoveNumber[gameId] > moveNumber) {
      throw 'Invalid move: The last store move number is higher';
    }

    gameStates.opponentMoves[gameId].push({
      moveFrom: moveFrom,
      moveTo: moveTo,
      moveSignature: moveSignature,
      newState: newState,
      newStateSignature: newStateSignature
    });
    gameStates.lastMoveNumber[gameId] = moveNumber;

    gameStates.updateLocalStorage();
  };

  /**
   * Delete a game from the local storage
   * @param gameId
     */
  gameStates.delete = function(gameId) {
    delete gameStates.selfMoves[gameId];
    delete gameStates.opponentMoves[gameId];
    delete gameStates.lastMoveNumber[gameId];

    gameStates.updateLocalStorage();
  };

  gameStates.getSelfMoves = function(gameId) {
    if(typeof(gameStates.selfMoves[gameId]) === 'undefined') {
      return [];
    }

    return gameStates.selfMoves[gameId];
  };
  gameStates.getLastSelfMove = function(gameId) {
    if(typeof(gameStates.selfMoves[gameId]) === 'undefined') {
      return [];
    }
    if(gameStates.selfMoves[gameId].length === 0) {
      throw 'This game has no self moves yet';
    }

    return gameStates.selfMoves[gameId][gameStates.selfMoves[gameId].length - 1];
  };
  gameStates.getSelfMove = function(gameId, moveNumber) {
    if(typeof(gameStates.selfMoves[gameId]) === 'undefined') {
      throw 'This game has no moves yet';
    }
    if(gameStates.selfMoves[gameId].length === 0) {
      throw 'This game has no self moves yet';
    }

    for(let currentMove of gameStates.selfMoves[gameId]) {
      let currentMoveNumber = gameStates.getMoveNumberFromState(currentMove.newState);

      if(currentMoveNumber === moveNumber) {
        return currentMove;
      }
    }
    throw 'Could not find moveNumber ' + moveNumber + ' for the game ' + gameId;
  };

  gameStates.getPreviousOpponentMove = function(gameId) {
    if(typeof(gameStates.opponentMoves[gameId]) === 'undefined') {
      throw 'This game has no moves yet';
    }
    if(gameStates.opponentMoves[gameId].length === 0) {
      throw 'This game has no opponent moves yet';
    }
    if(gameStates.opponentMoves[gameId].length < 2) {
      throw 'This game has no previous opponent move';
    }

    return gameStates.opponentMoves[gameId][gameStates.opponentMoves[gameId].length - 2];
  };
  gameStates.getLastOpponentMove = function(gameId) {
    if(typeof(gameStates.opponentMoves[gameId]) === 'undefined') {
      throw 'This game has no moves yet';
    }
    if(gameStates.opponentMoves[gameId].length === 0) {
      throw 'This game has no opponent moves yet';
    }

    return gameStates.opponentMoves[gameId][gameStates.opponentMoves[gameId].length - 1];
  };

  /**
   *
   * @param gameId
   * @return boolean
     */
  gameStates.isBlockchainStateNewer = function(gameId) {
    let blockchainState = Chess.getCurrentGameState(gameId);

    if(blockchainState) {
      if(typeof(gameStates.lastMoveNumber[gameId]) === 'undefined') {
        // No state in the local states, so return true
        return true;
      }

      let blockchainMoveNumber = gameStates.getMoveNumberFromState(blockchainState);

      return blockchainMoveNumber > gameStates.lastMoveNumber[gameId];
    }
    // No state in the blockchain, so return false
    return false;
  };

  /**
   * Get an array with all parameters needed to send them to the blockchain.
   * @param gameId
   * @return [opponentState, opponentStateSignature, moveSelfFrom, moveSelfTo]
     */
  gameStates.getLastMovePackage = function(gameId) {
    if(typeof(gameStates.selfMoves[gameId]) === 'undefined') {
      throw 'This game has no moves yet';
    }
    if(gameStates.selfMoves[gameId].length === 0) {
      throw 'This game has no self moves yet';
    }

    let lastSelfMove = gameStates.getLastSelfMove(gameId);
    let lastSelfMoveNumber = gameStates.getMoveNumberFromState(lastSelfMove.newState);

    // There was only one move, and it was the self move => this was our first move as white
    if (gameStates.lastMoveNumber[gameId] === 1) {
      return [null, null, lastSelfMove.moveFrom, lastSelfMove.moveTo];
    }

    let opponentMove = gameStates.getLastOpponentMove(gameId);
    let opponentMoveNumber = gameStates.getMoveNumberFromState(opponentMove.newState);

    // We have to fetch the opponent move that was the last move before our own move
    // If the opponents move was the last move, we need to check for the previous
    // move that *should* be the move before our last move
    if (opponentMoveNumber + 1 !== lastSelfMoveNumber) {
      // Fetch the previous opponents move
      opponentMove = gameStates.getPreviousOpponentMove(gameId);
      opponentMoveNumber = gameStates.getMoveNumberFromState(opponentMove.newState);

      // If this is not the move previous to our move, there was an error
      // Thus: *Something* has to fetch the last move from the blockchain
      if (opponentMoveNumber + 1 !== lastSelfMoveNumber) {
        throw 'No move package found for last self move.';
      }
    }

    return [
      opponentMove.newState,
      opponentMove.newStateSignature,
      lastSelfMove.moveFrom,
      lastSelfMove.moveTo
    ];
  };

  /**
   * Get last state from local storage
   * @param gameId
   * @returns state | false if not in local storage
     */
  gameStates.getLastLocalState = function (game) {
    if (typeof gameStates.lastMoveNumber[game.gameId] === 'undefined') {
      return false;
    }

    if (gameStates.selfMoves[game.gameId].length > 0) {
      let lastSelfMove = gameStates.getLastSelfMove(game.gameId);
      let lastSelfMoveNumber = gameStates.getMoveNumberFromState(lastSelfMove.newState);

      if (lastSelfMoveNumber === gameStates.lastMoveNumber[game.gameId]) {
        return lastSelfMove.newState;
      }
    }

    if (gameStates.opponentMoves[game.gameId].length > 0) {
      let lastOpponentMove = gameStates.getLastOpponentMove(game.gameId);
      let lastOpponentMoveNumber = gameStates.getMoveNumberFromState(lastOpponentMove.newState);

      if (lastOpponentMoveNumber === gameStates.lastMoveNumber[game.gameId]) {
        return lastOpponentMove.newState;
      }
    }

    throw 'Could not find last move in self or opponent moves';
  };

  gameStates.getLastBlockchainState = function(game) {
    let blockchainGameState = Chess.getCurrentGameState(game.gameId,
      {from: game.self.accountId});

    blockchainGameState = blockchainGameState.map(function(element) {
      if(typeof(element) === 'object' && typeof(element.toNumber) === 'function') {
        return element.toNumber();
      }

      return element;
    });

    return blockchainGameState;
  };

  gameStates.updateLocalStorage = function() {
    window.localStorage.setItem('gameStates.selfMoves',
      angular.toJson(gameStates.selfMoves));
    window.localStorage.setItem('gameStates.opponentMoves',
      angular.toJson(gameStates.opponentMoves));
    window.localStorage.setItem('gameStates.lastMoveNumber',
      angular.toJson(gameStates.lastMoveNumber));
  };
  gameStates.fetchFromLocalStorage = function() {
    if(typeof(window.localStorage['gameStates.selfMoves']) !== 'undefined') {
      try {
        let movesInLocalStorage = JSON.parse(window.localStorage['gameStates.selfMoves']);
        if(typeof(movesInLocalStorage) === 'object') {
          gameStates.selfMoves = movesInLocalStorage;
        }
        else {
          throw 'Invalid data format of selfMoves';
        }
      }
      catch(e) {
        console.log('Could not parse selfMoves from local storage', e);
      }
    }
    if(typeof(window.localStorage['gameStates.opponentMoves']) !== 'undefined') {
      try {
        let movesInLocalStorage = JSON.parse(window.localStorage['gameStates.opponentMoves']);
        if(typeof(movesInLocalStorage) === 'object') {
          gameStates.opponentMoves = movesInLocalStorage;
        }
        else {
          throw 'Invalid data format of opponentMoves';
        }
      }
      catch(e) {
        console.log('Could not parse opponentMoves from local storage', e);
      }
    }
    if(typeof(window.localStorage['gameStates.lastMoveNumber']) !== 'undefined') {
      try {
        let lastMoveNumber = JSON.parse(window.localStorage['gameStates.lastMoveNumber']);
        if(typeof(lastMoveNumber) === 'object') {
          gameStates.lastMoveNumber = lastMoveNumber;
        }
        else {
          throw 'Invalid data format of lastMoveNumber';
        }
      }
      catch(e) {
        console.log('Could not parse lastMoveNumber from local storage', e);
      }
    }
  };

  gameStates.fetchFromLocalStorage();

  return gameStates;
});
