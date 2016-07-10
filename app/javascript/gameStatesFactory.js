/* global angular */
import {Chess} from '../../contract/Chess.sol';
angular.module('dappChess').factory('gameStates', function () {
  let gameStates = {
    selfMoves: {},
    opponentMoves: {},
    lastMoveNumber: {}
  };

  gameStates.getMoveNumberFromState = function(state) {
    // Deal with states sometimes containing BigNumbers
    if(typeof(state[8]) === 'object') {
      return state[8].toNumber() * 128 + state[9].toNumber();
    }
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
      let currentMoveNumber = gameStates.getMoveNumberFromState(currentMove);

      if(currentMoveNumber === moveNumber) {
        return currentMove;
      }
    }
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
   * Throws if the last move was not done by oneself.
   * @param gameId
   * @return [oldOpponentState, oldOpponentStateSignature, moveSelfFrom, moveSelfTo]
     */
  gameStates.getSelfMovePackage = function(gameId) {
    if(typeof(gameStates.selfMoves[gameId]) === 'undefined') {
      throw 'This game has no moves yet';
    }
    if(gameStates.selfMoves[gameId].length === 0) {
      throw 'This game has no self moves yet';
    }

    let lastSelfMove = gameStates.selfMoves[gameId][gameStates.selfMoves[gameId].length - 1];
    let lastSelfMoveNumber = gameStates.getMoveNumberFromState(lastSelfMove);

    if(lastSelfMoveNumber !== gameStates.lastMoveNumber[gameId]) {
      throw 'The self move was not the last move';
    }

    // There was only one move, and it was the self move => this was our first move as white
    if(gameStates.lastMoveNumber[gameId] === 1) {
      return [null, null, lastSelfMove.moveFrom, lastSelfMove.moveTo];
    }

    let lastOpponentMove = gameStates.opponentMoves[gameId][
      gameStates.opponentMoves[gameId].length - 1
      ];

    return [
      lastOpponentMove.newState,
      lastOpponentMove.newStateSignature,
      lastSelfMove.moveFrom,
      lastSelfMove.moveTo
      ];
  };

  /**
   * Get last state from local storage
   * @param gameId
   * @returns state | false if not in local storage
     */
  gameStates.getLastLocalState = function(gameId) {
    if(typeof(gameStates.lastMoveNumber[gameId]) === 'undefined') {
      return false;
    }

    let lastSelfMove = gameStates.selfMoves[gameId][gameStates.selfMoves[gameId].length - 1];
    let lastSelfMoveNumber = gameStates.getMoveNumberFromState(lastSelfMove);

    if(lastSelfMoveNumber === gameStates.lastMoveNumber[gameId]) {
      return lastSelfMove.newState;
    }

    let lastOpponentMove = gameStates.opponentMoves[gameId][
      gameStates.opponentMoves[gameId].length - 1
    ];
    let lastOpponentMoveNumber = gameStates.getMoveNumberFromState(lastOpponentMove);

    if(lastOpponentMoveNumber === gameStates.lastMoveNumber[gameId]) {
      return lastOpponentMove.newState;
    }

    throw 'Could not find last move in self or opponent moves';
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
    if(typeof(window.localStorage.selfMoves) !== 'undefined') {
      try {
        let movesInLocalStorage = JSON.parse(window.localStorage.selfMoves);
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
    if(typeof(window.localStorage.opponentMoves) !== 'undefined') {
      try {
        let movesInLocalStorage = JSON.parse(window.localStorage.opponentMoves);
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
    if(typeof(window.localStorage.lastMoveNumber) !== 'undefined') {
      try {
        let lastMoveNumber = JSON.parse(window.localStorage.lastMoveNumber);
        if(typeof(movesInLocalStorage) === 'object') {
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
