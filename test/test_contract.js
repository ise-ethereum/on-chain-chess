/* global describe, it, beforeEach */
import { Chess, web3 } from '../contract/Chess.sol';
import { gameStateDisplay } from './utils';
import { Plan } from './utils.js';

var assert = require('chai').assert;

const defaultBoard = [-4,-2,-3,-5,-6,-3,-2,-4,0,0,0,4,0,0,0,0,
                      -1,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                      1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
                      4,2,3,5,6,3,2,4,0,0,0,116,0,0,0,0];
const emptyBoard = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];


function leftPad(nr, n, str){
  return Array(n-String(nr).length+1).join(str||'0')+nr;
}

function solSha3 (...args) {
    args = args.map(arg => {
        if (typeof arg === 'string') {
            if (arg.substring(0, 2) === '0x') {
                return arg.slice(2);
            } else {
                return web3.toHex(arg).slice(2);
            }
        }

        if (typeof arg === 'number') {
            if (arg < 0) {
              return leftPad((arg >>> 0).toString(16), 64, 'F');
            }
            return leftPad((arg).toString(16), 64, 0);
        } else {
          return '';
        }
    });

    args = args.join('');

    return '0x' + web3.sha3(args, { encoding: 'hex' });
}

function adjustPot(value) {
  return value * 2; // for testing in testrpc
}

describe('Chess contract', function() {
  this.timeout(60000);
  this.slow(500);

  var testGames = [];
  const player1 = web3.eth.accounts[0];
  const player2 = web3.eth.accounts[1];
  const player3 = web3.eth.accounts[2];

  // Remove this for CI/deploy, otherwise the test never finishes

  /*var debugFilter = Chess.DebugInts({});
  debugFilter.watch(function(error, result){
    console.log(result.args.message,
                result.args.value1.toNumber(),
                result.args.value2.toNumber(),
                result.args.value3.toNumber());
  });*/

  // We create a few test games here that will later be accessed in testGames[]
  describe('initGame()', function () {
    it('should initialize a game with player1 playing white with 1M Wei', function (done) {
      // Watch for event from contract to check if it worked
      var filter = Chess.GameInitialized({});
      filter.watch(function(error, result){
        testGames[0] = result.args.gameId;
        assert.isOk(result.args.gameId);
        assert.equal('Alice', result.args.player1Alias);
        assert.equal(player1, result.args.player1);
        assert.equal(player1, result.args.playerWhite);
        assert.equal(10, result.args.turnTime);
        filter.stopWatching(); // Need to remove filter again
        done();
      });

      Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000, value: 1000000});
    });

    it('should broadcast the initial game state', function(done) {
      var eventGamestate = Chess.GameStateChanged({});
      eventGamestate.watch(function(error, result){
        let state = result.args.state.map(n => n.toNumber());
        assert.deepEqual(gameStateDisplay(defaultBoard), gameStateDisplay(state));
        eventGamestate.stopWatching(); // Need to remove filter again
        done();
      });

      Chess.initGame('Bob', true, 10, {from: player1, gas: 2000000});
    });

    it('should initialize a game with player1 playing black', function (done) {
      // Watch for event from contract to check if it worked
      var filter = Chess.GameInitialized({});
      filter.watch(function(error, result){
        testGames[1] = result.args.gameId;
        assert.isOk(result.args.gameId);
        assert.equal('Susan', result.args.player1Alias);
        assert.equal(0, result.args.playerWhite);
        filter.stopWatching(); // Need to remove filter again
        done();
      });

      Chess.initGame('Susan', false, 10, {from: player1, gas: 2000000});
    });

    it('should have set game state to not ended', function() {
      assert.isFalse(Chess.isGameEnded(testGames[0]));
    });

    it('should have set gamesOfPlayers', () => {
      assert.isTrue(Chess.getGamesOfPlayer(player1).indexOf(testGames[0]) !== -1);
      assert.isTrue(Chess.getGamesOfPlayer(player1).indexOf(testGames[1]) !== -1);
    });

    it('should have the pot of 1M Wei for the first game', () => {
      assert.equal(adjustPot(1000000), Chess.games(testGames[0])[7].toNumber());
    });
  });

  describe('joinGame()', function () {
    it('should reject join with player with insufficient Ether', () => {
      assert.throws(function(){
        Chess.joinGame(testGames[0], 'Bob',
                       {from: player2, gas: 500000, value: adjustPot(500000)});
      }, Error);
    });
    it('should join player2 as black if player1 is white', function(done) {
      assert.doesNotThrow(function(){
        Chess.joinGame(testGames[0], 'Bob',
                       {from: player2, gas: 500000, value: adjustPot(1000000)});
      }, Error);

      // Watch for event from contract to check if it worked
      var filter = Chess.GameJoined({gameId: testGames[0]});
      filter.watch(function(error, result){
        assert.equal(testGames[0], result.args.gameId);
        assert.equal(player2, result.args.player2);
        assert.equal(player1, result.args.player1);
        assert.equal('Bob', result.args.player2Alias);
        assert.equal('Alice', result.args.player1Alias);
        assert.equal(player1, result.args.playerWhite);
        filter.stopWatching(); // Need to remove filter again
        done();
      });
    });

    it('should disallow joining a game with two payers', function() {
      assert.throws(function(){
        Chess.joinGame(testGames[0], 'Bob', {from: player2, gas: 500000});
      }, Error);
    });

    it('should join player2 as white if player1 is black', function(done) {
      assert.doesNotThrow(function(){
        Chess.joinGame(testGames[1], 'Bob', {from: player2, gas: 500000});
      }, Error);

      // Watch for event from contract to check if it worked
      var filter = Chess.GameJoined({gameId: testGames[1]});
      filter.watch(function(error, result){
        assert.equal(testGames[1], result.args.gameId);
        assert.equal(player2, result.args.playerWhite);
        filter.stopWatching(); // Need to remove filter again
        done();
      });
    });

    it('should have not change game.ended', function() {
      assert.isFalse(Chess.isGameEnded(testGames[0]));
      assert.isFalse(Chess.isGameEnded(testGames[1]));
    });

    it('should have set gamesOfPlayers', () => {
      assert.isTrue(Chess.getGamesOfPlayer(player2).indexOf(testGames[0]) !== -1);
      assert.isTrue(Chess.getGamesOfPlayer(player2).indexOf(testGames[1]) !== -1);
    });

    it('should have the pot of 2M Wei for the first game', () => {
      assert.equal(adjustPot(2000000), Chess.games(testGames[0])[7].toNumber());
    });
  });

  describe('surrender()', function () {
    // Setup a new game for this test
    let gameId;
    it('should initialize a new game and join both players', function(done) {
      Chess.initGame('Bob', true, 10, {from: player1, gas: 2000000, value: 1000000});
      var filter = Chess.GameInitialized({});
      filter.watch(function(error, result){
        gameId = result.args.gameId;
        filter.stopWatching();

        Chess.joinGame(gameId, 'Bob', {from: player2, gas: 500000, value: adjustPot(1000000)});
        var filter2 = Chess.GameJoined({gameId: gameId});
        filter2.watch(function(){
          filter2.stopWatching();
          done();
        });
      });
    });

    it('should throw an exception for message from non-participant', function() {
      assert.throws(function(){
        Chess.surrender(gameId, {from: player3, gas: 500000});
      }, Error);
    });

    it('should allow surrender from P1 and declare P2 as winner', function(done) {
      Chess.surrender(gameId, {from: player1, gas: 500000});
      var filter = Chess.GameEnded({gameId: gameId});
      filter.watch(function(){
        assert.equal(player2, Chess.games(gameId)[5]);
        filter.stopWatching();
        done();
      });
    });

    it('should have set game state to ended', function() {
      assert.isTrue(Chess.isGameEnded(gameId));
    });

    it('should throw an exception when surrendering a game that already ended', function() {
      assert.throws(function(){
        Chess.surrender(gameId, {from: player2, gas: 500000});
      }, Error);
    });

    it('should have assigned ether pot to winning player', () => {
      assert.equal(0, Chess.games(gameId)[7]);
      assert.equal(adjustPot(2000000), Chess.games(gameId)[9].toNumber());
    });
  });

  describe('moveFromState()', function () {
    let gameId1;
    beforeEach((done) => {
      // Watch for event from contract to check if it worked
      var filter = Chess.GameInitialized({});
      filter.watch((error, result) => {
        gameId1 = result.args.gameId;
        assert.isOk(result.args.gameId);
        filter.stopWatching();
        Chess.joinGame(gameId1, 'Bob', {from: player2, gas: 500000});
        done();
      });

      // runs before each test in this block
      Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000});
    });

    it('should accept a valid move with valid signatures', function (done) {
      let fromIndex = 100;
      let toIndex = 84;
      let hashState = solSha3(...defaultBoard, gameId1);
      let sigState = web3.eth.sign(player2, hashState);
      // As player1 is the next player, this move should be valid
      assert.doesNotThrow(function () {
        // white pawn e7e6
        Chess.moveFromState(gameId1, defaultBoard, fromIndex, toIndex,
                            sigState, {from: player1, gas: 2000000});
      }, Error);

      // Helper to wait for multiple async callbacks
      let numberOfDone = 0;
      const allDone = function() {
        numberOfDone++;
        if (numberOfDone >= 2) {
          done();
        }
      };

      // Watch for event from contract to check if the Move worked
      var filter = Chess.Move({gameId: gameId1});
      filter.watch(function(error, result){
        assert.equal(player1, result.args.player);
        assert.equal(100, result.args.fromIndex);
        assert.equal(84, result.args.toIndex);
        filter.stopWatching(); // Need to remove filter again
        allDone();
      });

      // Watch for GameStateChanged event to check that all pieces and flags
      // were updated

      let expectedState = [...defaultBoard];
      expectedState[100] = 0; // moved piece away
      expectedState[84] = defaultBoard[100];
      expectedState[56] = -1; // next player black
      expectedState[8] = 1 >> 7; // updated move count
      expectedState[9] = 1 % 128; // updated move count
      var filter2 = Chess.GameStateChanged({gameId: gameId1});
      filter2.watch(function (error, result) {
        assert.deepEqual(gameStateDisplay(expectedState), gameStateDisplay(result.args.state));
        filter2.stopWatching(); // Need to remove filter again
        allDone();
      });
    });

    it('should work with some other states', () => {
      // Test a simple move on a state
      let newState = [-4, -2, -3, -5, -6, -3, -2, -4, 0, 1, 0, 4, 0, 0, 0, 0,
                      -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0,
                      0, 0, 0, 0, 0, 0, 0, 0,         0, 0, 0, 0, 0, 0, 0, 0,
                      0, 0, 0, 0, 0, 0, 0, 0,        -1, 0, 0, 0, 0, 80, 0, 0,
                      1, 0, 0, 0, 0, 0, 0, 0,         0, 0, 0, 0, 0, 80, 0, 0,
                      0, 0, 0, 0, 0, 0, 0, 0,         0, 0, 0, 0, 0, 0, 0, 0,
                      0, 1, 1, 1, 1, 1, 1, 1,         0, 0, 0, 0, 0, 0, 0, 0,
                      4, 2, 3, 5, 6, 3, 2, 4,         0, 0, 0, 116, 0, 0, 0, 0];
      let sigStatenew = web3.eth.sign(player1, solSha3(...newState, gameId1));
      let fromIndex = 23;
      let toIndex = 55;

      assert.doesNotThrow(function () {
        Chess.moveFromState(gameId1, newState, fromIndex, toIndex,
                            sigStatenew, {from: player2, gas: 2000000});
      }, Error);

      // Test putting the black king in check
      newState = [-4,-2,-3,-5, 0,-3,-2,-4,    0,12,0,20,0,0,0,0,
                  -1,-1,-1, 0,-6, 0, 0, 0,    0,0,0,0,0,0,0,0,
                   0, 0, 0,-1, 3,-1, 5,-1,    0,0,0,0,0,0,0,0,
                   0, 0, 0, 0, 0, 0, 0, 0,    1,0,0,0,0,0,-1,-1,
                   0, 0, 0, 0, 0, 0, 0, 0,    0,0,0,0,0,0,0,0,
                   1, 0, 0, 0, 1, 0, 0, 0,    0,0,0,0,0,0,0,0,
                   0, 1, 1, 1, 0, 1, 1, 1,    0,0,0,0,0,0,0,0,
                   4, 2, 3, 0, 6, 0, 2, 4,    0,0,0,116,0,0,0,0];
      fromIndex = 38;
      toIndex = 21;
      sigStatenew = web3.eth.sign(player2, solSha3(...newState, gameId1));
      assert.doesNotThrow(function () {
        Chess.moveFromState(gameId1, newState, fromIndex, toIndex,
                            sigStatenew, {from: player1, gas: 2000000});
      }, Error);
    });

    it('should set end state to be able to claim win ', () => {
      // Checking black king
      let newState = [-4,-2,-3,-5,-6,-3,-2,-4,  0,10, 0, 4,0,0,0,0,
                       0,-1,-1,-1, 0,-1,-1, 0,  0, 0, 0, 0,0,0,0,0,
                       0, 0, 0, 0, 0, 5, 0,-1,  0, 0, 0, 0,0,0,0,0,
                      -1, 0, 0, 0,-1, 0, 0, 0,  1, 0, 0, 0,0,0,0,0,
                       0, 0, 3, 0, 0, 0, 0, 0,  0, 0, 0, 0,0, 0,0,0,
                       0, 0, 0, 0, 1, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0,0,
                       1, 1, 1, 1, 0, 1, 1, 1,  0, 0, 0, 0, 0, 0, 0,0,
                       4, 2, 3, 0, 6, 0, 2, 4,  0, 0, 0,116,0,0,0,0];
      let fromIndex = 66;
      let toIndex = 21;
      let sigStatenew = web3.eth.sign(player2, solSha3(...newState, gameId1));
      assert.doesNotThrow(function () {
        Chess.moveFromState(gameId1, newState, fromIndex, toIndex,
                            sigStatenew, {from: player1, gas: 2000000});
      }, Error);

      assert.doesNotThrow(function () {
        Chess.claimWin(gameId1, {from: player1, gas: 2000000});
      }, Error);
    });

    it('should throw an exception for message from non-participant', function () {
      let fromIndex = 100;
      let toIndex = 84;
      let hashState = solSha3(...defaultBoard, gameId1);
      let sigState = web3.eth.sign(player2, hashState);

      assert.throws(function () {
        Chess.moveFromState(gameId1, defaultBoard, fromIndex, toIndex,
                            sigState, {from: player3, gas: 2000000});
      }, Error);
    });

    it('should throw an exception when it is not the turn of the message sender', function () {
      let fromIndex = 100;
      let toIndex = 84;
      let hashState = solSha3(...defaultBoard, gameId1);
      let sigState = web3.eth.sign(player2, hashState);

      assert.throws(function () {
        Chess.moveFromState(gameId1, defaultBoard, fromIndex, toIndex,
                            sigState, {from: player2, gas: 2000000});
      }, Error);
    });

    it('should throw when state is not signed by opponent', function () {
      let fromIndex = 100;
      let toIndex = 84;
      let hashState = solSha3(...defaultBoard, gameId1);
      let sigState = web3.eth.sign(player3, hashState); // SIGNED BY PLAYER 3 INSTEAD OF PLAYER 2

      assert.throws(function () {
        Chess.moveFromState(gameId1, defaultBoard, fromIndex, toIndex,
                            sigState, {from: player1, gas: 2000000});
      }, Error);
    });

    it('should throw when signed state and state in call do not match 1/2', function () {
      let fromIndex = 100;
      let toIndex = 84;
      let differentBoard = [...defaultBoard]; // CHANGE BOARD
      differentBoard[5] = 0;
      differentBoard[6] = 0;
      let hashState = solSha3(...defaultBoard, gameId1); // HASH OF DEFAULTBOARD
      let sigState = web3.eth.sign(player2, hashState);

      assert.throws(function () {
        Chess.moveFromState(gameId1, differentBoard, fromIndex, toIndex,
                            sigState, {from: player1, gas: 2000000});
      }, Error);
    });

    it('should throw when signed state and state in call do not match 2/2', function () {
      let fromIndex = 100;
      let toIndex = 84;
      let differentBoard = [...defaultBoard]; // CHANGE BOARD
      differentBoard[5] = 0;
      differentBoard[6] = 0;
      let hashState = solSha3(...differentBoard, gameId1); // HASH OF DIFFERENTBOARD
      let sigState = web3.eth.sign(player2, hashState);

      assert.throws(function () {
        Chess.moveFromState(gameId1, defaultBoard, fromIndex, toIndex,
                            sigState, {from: player1, gas: 2000000});
      }, Error);
    });

    it('should throw when game already ended', function () {
      Chess.surrender(gameId1, {from: player1, gas: 500000});
      assert.isTrue(Chess.isGameEnded(gameId1));
      let fromIndex = 100;
      let toIndex = 84;
      let hashState = solSha3(...defaultBoard, gameId1);
      let sigState = web3.eth.sign(player2, hashState);

      assert.throws(function () {
        Chess.moveFromState(gameId1, defaultBoard, fromIndex, toIndex,
                            sigState, {from: player1, gas: 2000000});
      }, Error);
    });

    it('should throw an exception when a move is invalid', function () {
      let fromIndex = 96;
      let toIndex = 96;
      let hashState = solSha3(...defaultBoard, gameId1);
      let sigState = web3.eth.sign(player2, hashState);

      // Test some invalid moves, but from correct player
      assert.throws(function () {
        // white pawn a7a7
        Chess.moveFromState(gameId1, defaultBoard, fromIndex, toIndex,
                            sigState, {from: player1, gas: 2000000});
      }, Error);

      fromIndex = 112;
      toIndex = 96;
      assert.throws(function () {
        // white rook a8a7
        Chess.moveFromState(gameId1, defaultBoard, fromIndex, toIndex,
                            sigState, {from: player1, gas: 2000000});
      }, Error);
    });

    it('should throw when moveCount of new state is lower than old state', function () {
      let fromIndex = 100;
      let toIndex = 84;
      let boardHigh = [...defaultBoard]; // BOARD WITH MOVE COUNT = 0
      // boardHigh[8] = 33;
      let hashState = solSha3(...boardHigh, gameId1);
      let sigState = web3.eth.sign(player2, hashState);

      // First set State with moveCount = 0;
      assert.doesNotThrow(function () {
        Chess.moveFromState(gameId1, boardHigh, fromIndex, toIndex,
                            sigState, {from: player1, gas: 2000000});
      }, Error);
      // moveCount of board in BC now 1

      // Now set State with moveCount = 0 again;
      let boardLow = [...defaultBoard]; // BOARD WITH LOWER MOVE COUNT
      // boardLow[8] = 3;
      hashState = solSha3(...boardLow, gameId1);
      sigState = web3.eth.sign(player2, hashState);

      assert.throws(function () {
        Chess.moveFromState(gameId1, boardLow, fromIndex, toIndex,
                            sigState, {from: player1, gas: 2000000});
      }, Error);
    });
  });

  describe('closePlayerGame()', function () {
    let gameId, gameId2;
    it('should initialize a game with 1 player only', function (done) {
      Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000, value: 1000000});

      // Watch for event from contract to check if it worked
      let filter = Chess.GameInitialized({});

      filter.watch(function (error, result) {
        gameId = result.args.gameId;
        assert.isOk(result.args.gameId);
        filter.stopWatching(); // Need to remove filter again
        done();
      });
    });

    it('should be able to close a game with 1 player only', function() {
      assert.doesNotThrow(function () {
        Chess.closePlayerGame(gameId, {from: player1, gas: 100000});
      }, Error);
    });

    it('should have set ended', function() {
      assert.isTrue(Chess.isGameEnded(gameId));
    });

    it('should have deleted game from openGames', () => {
      // Fetch open games
      const end = '0x656e640000000000000000000000000000000000000000000000000000000000';
      for (let currentGameId = Chess.head();
           currentGameId !== end;
           currentGameId = Chess.openGameIds(currentGameId)) {
        assert.notEqual(gameId, currentGameId);
      }
    });

    it('should have deleted game from gamesOfPlayers of P1', () => {
      const end = '0x0000000000000000000000000000000000000000000000000000000000000000';
      for (let currentGameId = Chess.gamesOfPlayersHeads(player1);
           currentGameId !== end;
           currentGameId = Chess.gamesOfPlayers(player1, currentGameId)) {
        assert.notEqual(gameId, currentGameId);
      }
    });

    it('should have assigned ether pot back to player 1', () => {
      assert.equal(0, Chess.games(gameId)[7]);
      assert.equal(adjustPot(1000000), Chess.games(gameId)[8].toNumber());
    });

    // next test
    it('should initialize 4 open games', () => {
      assert.doesNotThrow(() => {
        Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000});
        Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000});
        Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000});
        Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000});
      });
    });


    it('should initialize 1 open game (gameId2)', (done) => {
      Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000});
      let filter = Chess.GameInitialized({});
      filter.watch(function (error, result) {
        gameId2 = result.args.gameId;
        assert.isOk(result.args.gameId);
        filter.stopWatching();
        done();
      });
    });

    // TODO smarter way to start 4 games with 2 players ?
    it('should initialize game 1/4 with 2 players', (done) => {
      // create game 1
      Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000});
      let filter = Chess.GameInitialized({});
      filter.watch(function (error, result) {
        let myGame = result.args.gameId;
        assert.isOk(result.args.gameId);
        filter.stopWatching();
        Chess.joinGame(myGame, 'Bob', {from: player2, gas: 500000});
        done();
      });
    });
    it('should initialize game 2/4 with 2 players', (done) => {
      // create game 2
      Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000});
      let filter = Chess.GameInitialized({});
      filter.watch(function (error, result) {
        let myGame = result.args.gameId;
        assert.isOk(result.args.gameId);
        filter.stopWatching();
        Chess.joinGame(myGame, 'Bob', {from: player2, gas: 500000});
        done();
      });
    });
    it('should initialize game 3/4 with 2 players', (done) => {
      // create game 3 (will be closed later)
      Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000});
      let filter = Chess.GameInitialized({});
      filter.watch(function (error, result) {
        gameId = result.args.gameId;
        assert.isOk(result.args.gameId);
        filter.stopWatching();
        Chess.joinGame(gameId, 'Bob', {from: player2, gas: 500000});
        done();
      });
    });
    it('should initialize game 4/4 with 2 players', (done) => {
      // create game 4
      Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000});
      let filter = Chess.GameInitialized({});
      filter.watch(function (error, result) {
        let myGame = result.args.gameId;
        assert.isOk(result.args.gameId);
        filter.stopWatching();
        Chess.joinGame(myGame, 'Bob', {from: player2, gas: 500000});
        done();
      });
    });

    it('should not be able to close a not finished game', () => {
      assert.throws(() => {
        Chess.closePlayerGame(gameId, {from: player1, gas: 100000});
      }, Error);
    });

    it('should surrender game 3', () => {
      Chess.surrender(gameId, {from: player2, gas: 500000});
    });

    it('should be able to close a surrendered game', () => {
      assert.doesNotThrow(() => {
        Chess.closePlayerGame(gameId, {from: player1, gas: 100000});
      }, Error);
    });
    it('should be able to close an open game', () => {
      assert.doesNotThrow(() => {
        Chess.closePlayerGame(gameId2, {from: player1, gas: 100000});
      }, Error);
    });

    it('should have deleted games from openGames', () => {
      // Fetch open games
      const end = '0x656e640000000000000000000000000000000000000000000000000000000000';
      for (let currentGameId = Chess.head();
           currentGameId !== end;
           currentGameId = Chess.openGameIds(currentGameId)) {
        assert.notEqual(gameId, currentGameId);
        assert.notEqual(gameId2, currentGameId);
      }
    });

    it('should have deleted games from gamesOfPlayers of P1', () => {
      const end = '0x0000000000000000000000000000000000000000000000000000000000000000';
      for (let currentGameId = Chess.gamesOfPlayersHeads(player1);
           currentGameId !== end;
           currentGameId = Chess.gamesOfPlayers(player1, currentGameId)) {
        assert.notEqual(gameId, currentGameId);
        assert.notEqual(gameId2, currentGameId);
      }
    });

    it('should not delete games from gamesOfPlayers of P2', () => {
      const end = '0x0000000000000000000000000000000000000000000000000000000000000000';
      for (let currentGameId = Chess.gamesOfPlayersHeads(player2);
           currentGameId !== end;
           currentGameId = Chess.gamesOfPlayers(player1, currentGameId)) {
        assert.notEqual(gameId, currentGameId);
        assert.notEqual(gameId2, currentGameId);
      }
    });
  });

  describe('Endgame', () => {
    let gameId;
    beforeEach((done) => {
      // Watch for event from contract to check if it worked
      var filter = Chess.GameInitialized({});
      filter.watch((error, result) => {
        gameId = result.args.gameId;
        assert.isOk(result.args.gameId);
        filter.stopWatching();
        Chess.joinGame(gameId, 'Bob', {from: player2, gas: 500000, value: adjustPot(1000000)});
        done();
      });

      // runs before each test in this block
      Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000, value: 1000000});
    });

    describe('claimWin()', () => {
      it('should allow claimwin and send event', (done) => {
        assert.doesNotThrow(() => {
          Chess.move(gameId, 101, 69, {from: player1, gas: 500000});
          Chess.move(gameId, 20, 52, {from: player2, gas: 500000});
          Chess.move(gameId, 96, 64, {from: player1, gas: 500000});
          Chess.move(gameId, 3, 71, {from: player2, gas: 500000});
        });

        assert.doesNotThrow(() => {
          Chess.claimWin(gameId, {from: player2, gas: 2000000});
        });

        let filter = Chess.GameTimeoutStarted({});
        filter.watch((error, result) => {
          assert.equal(gameId, result.args.gameId);
          assert.isAbove(new Date().getTime() / 1000, result.args.timeoutStarted);
          assert.equal(1, result.args.timeoutState);
          filter.stopWatching();
          done();
        });
      });

      it('should reject claimWin from current player', () => {
        assert.throws(() => {
          Chess.claimWin(gameId, {from: player1, gas: 2000000});
        });
      });

      it('should reject claimWin directly after claimTimeout', () => {
        assert.doesNotThrow(() => {
          Chess.move(gameId, 101, 69, {from: player1, gas: 500000});
          Chess.move(gameId, 20, 52, {from: player2, gas: 500000});
          Chess.move(gameId, 96, 64, {from: player1, gas: 500000});
          Chess.move(gameId, 3, 71, {from: player2, gas: 500000});
        });
        assert.doesNotThrow(() => {
          Chess.claimWin(gameId, {from: player2, gas: 2000000});
        });
        assert.throws(() => {
          Chess.claimTimeoutEnded(gameId, {from: player2, gas: 200000});
        });
      });

      it('should reject claimTimeoutEnded from P1 after claimTimeout from P2', () => {
        assert.doesNotThrow(() => {
          Chess.move(gameId, 101, 69, {from: player1, gas: 2000000});
          Chess.move(gameId, 20, 52, {from: player2, gas: 2000000});
          Chess.move(gameId, 96, 64, {from: player1, gas: 2000000});
          Chess.move(gameId, 3, 71, {from: player2, gas: 2000000});
        });
        assert.doesNotThrow(() => {
          Chess.claimWin(gameId, {from: player2, gas: 2000000});
        });
        assert.throws(() => {
          Chess.claimTimeoutEnded(gameId, {from: player1, gas: 200000});
        });
      });
    });

    describe('claimTimeout()', () => {
      it('should allow claimTimeout and send event', (done) => {
        assert.doesNotThrow(() => {
          Chess.claimTimeout(gameId, {from: player2, gas: 200000});
        });

        let filter = Chess.GameTimeoutStarted({});
        filter.watch((error, result) => {
          assert.equal(gameId, result.args.gameId);
          assert.isAbove(new Date().getTime() / 1000, result.args.timeoutStarted);
          assert.equal(2, result.args.timeoutState.toNumber());
          filter.stopWatching();
          done();
        });
      });

      it('should reject claimTimeout from current player', () => {
        assert.throws(() => {
          Chess.claimTimeout(gameId, {from: player1, gas: 200000});
        });
      });

      it('should allow move after claimTimeout and reject claimTimeoutEnded afterwards', () => {
        assert.doesNotThrow(() => {
          Chess.claimTimeout(gameId, {from: player2, gas: 200000});
        });
        assert.doesNotThrow(() => {
          Chess.move(gameId, 100, 68, {from: player1, gas: 500000});
        });
        assert.throws(() => {
          Chess.claimTimeoutEnded(gameId, {from: player2, gas: 200000});
        });
      });

      it('should reject claimTimeoutEnded directly after claimTimeout', () => {
        assert.doesNotThrow(() => {
          Chess.claimTimeout(gameId, {from: player2, gas: 200000});
        });
        assert.throws(() => {
          Chess.claimTimeoutEnded(gameId, {from: player2, gas: 200000});
        });
      });

      it('should reject claimTimeoutEnded from P1 after claimTimeout from P2', () => {
        assert.doesNotThrow(() => {
          Chess.claimTimeout(gameId, {from: player2, gas: 200000});
        });
        assert.throws(() => {
          Chess.claimTimeoutEnded(gameId, {from: player1, gas: 200000});
        });
      });
    });
    describe('offerDraw()', () => {
      it('should allow offerDraw and send event', (done) => {
        assert.doesNotThrow(() => {
          Chess.offerDraw(gameId, {from: player2, gas: 200000});
        });

        let filter = Chess.GameTimeoutStarted({});
        filter.watch((error, result) => {
          assert.equal(gameId, result.args.gameId);
          assert.isAbove(new Date().getTime() / 1000, result.args.timeoutStarted);
          assert.equal(-1, result.args.timeoutState);
          filter.stopWatching();
          done();
        });
      });

      it('should accept offerDraw from current player', (done) => {
        assert.doesNotThrow(() => {
          Chess.offerDraw(gameId, {from: player1, gas: 200000});
        });

        let filter = Chess.GameTimeoutStarted({});
        filter.watch((error, result) => {
          assert.equal(gameId, result.args.gameId);
          assert.isAbove(new Date().getTime() / 1000, result.args.timeoutStarted);
          assert.equal(-2, result.args.timeoutState);
          filter.stopWatching();
          done();
        });
      });

      it('should reject claimTimeoutEnded directly after offerDraw', () => {
        assert.doesNotThrow(() => {
          Chess.claimTimeout(gameId, {from: player2, gas: 200000});
        });
        assert.throws(() => {
          Chess.claimTimeoutEnded(gameId, {from: player2, gas: 200000});
        });
      });

      it('should reject offerdraw from P1 but not from P2', () => {
        assert.doesNotThrow(() => {
          Chess.offerDraw(gameId, {from: player2, gas: 200000});
        });
        assert.throws(() => {
          Chess.offerDraw(gameId, {from: player1, gas: 200000});
        });
      });
    });

    describe('claimTimeoutEnded()', () => {
      it('should reject claimTimeoutEnded only', () => {
        assert.throws(() => {
          Chess.claimTimeoutEnded(gameId, {from: player1, gas: 200000});
        });
        assert.throws(() => {
          Chess.claimTimeoutEnded(gameId, {from: player2, gas: 200000});
        });
      });
    });

    describe('confirmGameEnded()', () => {
      it('should allow confirmGameEnded after claimWin, update state and ELO scores', (done) => {
        assert.doesNotThrow(() => {
          Chess.claimTimeout(gameId, {from: player2, gas: 200000});
        });
        assert.doesNotThrow(() => {
          Chess.confirmGameEnded(gameId, {from: player1, gas: 200000});
        });

        let plan = new Plan(3, () => {
          done();
        });

        let filter = Chess.GameEnded({});
        filter.watch((error, result) => {
          assert.equal(gameId, result.args.gameId);
          assert.equal(player2, Chess.games(result.args.gameId)[5]);
          filter.stopWatching();
          done();
        });

        // EloScoreUpdate event P2
        let filter2 = Chess.EloScoreUpdate({player: player2});
        filter2.watch((error, result) => {
          assert.equal(player2, result.args.player);
          assert.equal(121, result.args.score.toNumber());
          filter2.stopWatching();
          plan.ok();
        });

        // EloScoreUpdate event P1
        let filter3 = Chess.EloScoreUpdate({player: player1});
        filter3.watch((error, result) => {
          assert.equal(player1, result.args.player);
          assert.equal(101, result.args.score.toNumber());
          filter3.stopWatching();
          plan.ok();
        });
      });

      it('should assign ether pot to winning player after confirmGameEnded', (done) => {
        assert.doesNotThrow(() => {
          Chess.move(gameId, 101, 69, {from: player1, gas: 500000});
          Chess.move(gameId, 20, 52, {from: player2, gas: 500000});
          Chess.move(gameId, 96, 64, {from: player1, gas: 500000});
          Chess.move(gameId, 3, 71, {from: player2, gas: 500000});
        });
        assert.doesNotThrow(() => {
          Chess.claimWin(gameId, {from: player2, gas: 200000});
        });
        assert.doesNotThrow(() => {
          Chess.confirmGameEnded(gameId, {from: player1, gas: 200000});
        });

        // GameEnded event
        let filter = Chess.GameEnded({gameId: gameId});
        filter.watch((error, result) => {
          assert.equal(gameId, result.args.gameId);
          assert.equal(player2, Chess.games(result.args.gameId)[5]);
          // Pot is 0
          assert.equal(0, Chess.games(result.args.gameId)[7]);
          // Player 2 got pot
          assert.equal(adjustPot(2000000), Chess.games(result.args.gameId)[9].toNumber());
          filter.stopWatching();
          done();
        });
      });

      it('should allow confirmGameEnded after offerDraw', (done) => {
        assert.doesNotThrow(() => {
          Chess.offerDraw(gameId, {from: player2, gas: 200000});
          Chess.confirmGameEnded(gameId, {from: player1, gas: 200000});
        });

        let filter = Chess.GameEnded({});
        filter.watch((error, result) => {
          assert.equal(gameId, result.args.gameId);
          assert.equal(0, Chess.games(result.args.gameId)[5]);
          filter.stopWatching();
          done();
        });
      });

      it('should split ether pot after confirmed draw', (done) => {
        assert.doesNotThrow(() => {
          Chess.offerDraw(gameId, {from: player2, gas: 200000});
          Chess.confirmGameEnded(gameId, {from: player1, gas: 200000});
        });

        let filter = Chess.GameEnded({});
        filter.watch((error, result) => {
          assert.equal(gameId, result.args.gameId);
          assert.equal(0, Chess.games(result.args.gameId)[5]);
          // Pot is 0
          assert.equal(0, Chess.games(result.args.gameId)[7]);
          // Player 1 and player 2 got 1M Wei each
          assert.equal(adjustPot(1000000), Chess.games(result.args.gameId)[8].toNumber());
          assert.equal(adjustPot(1000000), Chess.games(result.args.gameId)[9].toNumber());

          filter.stopWatching();
          done();
        });
      });

      it('should reject confirmGameEnded only', () => {
        assert.throws(() => {
          Chess.confirmGameEnded(gameId, {from: player1, gas: 200000});
        });
      });
    });

  });
  describe('move()', function () {
    describe('#general', function () {
      it('should throw an exception when it is not this player\'s turn', function () {
        assert.throws(function () {
          Chess.move(testGames[0], 0, 0, {from: player2, gas: 500000});
        }, Error);
      });

      it('should throw an exception when P1 is black, so they cannot move first', function () {
        assert.throws(function () {
          Chess.move(testGames[1], 0, 0, {from: player1, gas: 500000});
        }, Error);
      });

      it('should throw an exception when a move is invalid', function () {
        // Test some invalid moves, but from correct player
        assert.throws(function () {
          // white pawn a7a7
          Chess.move(testGames[0], 96, 96, {from: player1, gas: 500000});
        }, Error);

        assert.throws(function () {
          // white rook a8a7
          Chess.move(testGames[0], 112, 96, {from: player1, gas: 500000});
        }, Error);
      });

      it('should accept a valid move', function (done) {
        // As player1 is the next player, this move should be valid
        assert.doesNotThrow(function () {
          // white pawn e7e6
          Chess.move(testGames[0], 100, 84, {from: player1, gas: 500000});
        }, Error);

        // Helper to wait for multiple async callbacks
        let numberOfDone = 0;
        const allDone = function() {
          numberOfDone++;
          if (numberOfDone >= 2) {
            done();
          }
        };

        // Watch for event from contract to check if the Move worked
        var filter = Chess.Move({gameId: testGames[0]});
        filter.watch(function(error, result){
          assert.equal(player1, result.args.player);
          assert.equal(100, result.args.fromIndex);
          assert.equal(84, result.args.toIndex);
          filter.stopWatching(); // Need to remove filter again
          allDone();
        });

        // Watch for GameStateChanged event to check that all pieces and flags
        // were updated
        let expectedState = [...defaultBoard];
        expectedState[100] = 0; // moved piece away
        expectedState[84] = defaultBoard[100];
        expectedState[56] = -1; // next player black
        expectedState[8] = 1 >> 7; // updated move count
        expectedState[9] = 1 % 128; // updated move count
        var filter2 = Chess.GameStateChanged({gameId: testGames[0]});
        filter2.watch(function(error, result){
          assert.deepEqual(gameStateDisplay(expectedState), gameStateDisplay(result.args.state));
          filter2.stopWatching(); // Need to remove filter again
          allDone();
        });
      });

      it('should accept valid moves', function () {
        // Test for several other valid moves
        assert.doesNotThrow(function () {
          // black pawn b2b3 -- Pawn normal move
          Chess.move(testGames[0], 17, 33, {from: player2, gas: 500000});

          // white knight g8h6 -- Knight move
          Chess.move(testGames[0], 118, 87, {from: player1, gas: 500000});

          // black pawn a2a4 -- Pawn double move
          Chess.move(testGames[0], 16, 48, {from: player2, gas: 500000});

          // white queen d8h4 -- Queen move
          Chess.move(testGames[0], 115, 55, {from: player1, gas: 500000});

          // black rook a1a3 -- Rook move
          Chess.move(testGames[0], 0, 32, {from: player2, gas: 500000});

          // white king e8f7 -- King move
          Chess.move(testGames[0], 116, 100, {from: player1, gas: 500000});
        }, Error);
      });

      it('should set game state and accept valid move', function (done) {
        let newState = [...defaultBoard];
        newState[32] = -6; // Black king on a2
        newState[67] = 5; // White queen on d4
        newState[8] = 127 >> 7; // Move count at the edge of int8 range
        newState[9] = 127 % 128;

        let numDone = 0;
        const oneDone = function() {
          numDone++;
          if (numDone >= 2) {
            done();
          }
        };

        Chess.setGameState(testGames[0], newState, player1, {from: player1, gas: 2000000});
        var filter = Chess.GameStateChanged({gameId: testGames[0]});
        filter.watch(function(error, result){
          // First event, test that it worked by sending a Move
          if (numDone === 0) {
            assert.deepEqual(gameStateDisplay(newState), gameStateDisplay(result.args.state));
            assert.doesNotThrow(function(){
              // white queen d4c4 -- Queen move that checks black king on a6
              Chess.move(testGames[0], 67, 66, {from: player1, gas: 500000});
            }, Error);
          }
          // The second event occurs after the move and should have updated
          // the game state accordingly
          if (numDone === 1) {
            newState[66] = newState[67]; // Piece was moved
            newState[67] = 0;
            newState[56] = -1;
            newState[8] = 128 >> 7; // = 1, Move count has overflown
            newState[9] = 128 % 128;
            assert.deepEqual(gameStateDisplay(newState), gameStateDisplay(result.args.state));
            filter.stopWatching(); // Need to remove filter again
          }
          oneDone();
        });
      });
    });

    describe('#validation', () => {
      let gameId;
      beforeEach((done) => {
        // runs before each test in this block
        Chess.initGame('Alice', true, 10, {from: player1, gas: 2000000});

        // Watch for event from contract to check if it worked
        var filter = Chess.GameInitialized({});
        filter.watch((error, result) => {
          gameId = result.args.gameId;
          assert.isOk(result.args.gameId);
          filter.stopWatching();
          Chess.joinGame(gameId, 'Bob', {from: player2, gas: 500000});
          done();
        });
      });

      it('should accept a very short game, but not more', () => {
        assert.doesNotThrow(() => {
          Chess.move(gameId, 100, 68, {from: player1, gas: 500000});
          Chess.move(gameId, 20, 52, {from: player2, gas: 500000});

          Chess.move(gameId, 115, 55, {from: player1, gas: 500000});
          Chess.move(gameId, 4, 20, {from: player2, gas: 500000});

          Chess.move(gameId, 55, 52, {from: player1, gas: 500000});
          // checkmate
        });
        assert.throws(() => {
          Chess.move(gameId, 20, 4, {from: player2, gas: 500000});
        }, Error);
        assert.throws(() => {
          Chess.move(gameId, 20, 35, {from: player2, gas: 500000});
        }, Error);
        assert.throws(() => {
          Chess.move(gameId, 20, 36, {from: player2, gas: 500000});
        }, Error);
        assert.throws(() => {
          Chess.move(gameId, 20, 37, {from: player2, gas: 500000});
        }, Error);
        assert.throws(() => {
          Chess.move(gameId, 17, 33, {from: player2, gas: 500000});
        }, Error);
      });

      it('should accept another very short game', () =>{
        assert.doesNotThrow(() => {
          Chess.move(gameId, 102, 70, {from: player1, gas: 500000});
          Chess.move(gameId, 20, 52, {from: player2, gas: 500000});

          Chess.move(gameId, 101, 69, {from: player1, gas: 500000});
          Chess.move(gameId, 3, 71, {from: player2, gas: 500000});
          // checkmate
        });
        assert.throws(() => {
          Chess.move(gameId, 116, 101, {from: player1, gas: 500000});
        }, Error);
        assert.throws(() => {
          Chess.move(gameId, 118, 85, {from: player1, gas: 500000});
        }, Error);
        assert.throws(() => {
          Chess.move(gameId, 97, 65, {from: player1, gas: 500000});
        }, Error);
      });

      it('should accept a \'normal\' game and refuse invalid moves between', () => {
        assert.doesNotThrow(() => {
          Chess.move(gameId, 100, 68, {from: player1, gas: 500000});
          Chess.move(gameId, 20, 52, {from: player2, gas: 500000});

          Chess.move(gameId, 118, 85, {from: player1, gas: 500000});
          Chess.move(gameId, 21, 37, {from: player2, gas: 500000});
        }, Error, 'block 1');
        assert.throws(() => {
          Chess.move(gameId, 85, 53, {from: player1, gas: 500000});
        }, Error, '', 'invalid knight move');
        assert.doesNotThrow(() => {
          Chess.move(gameId, 85, 52, {from: player1, gas: 500000});
          Chess.move(gameId, 37, 52, {from: player2, gas: 500000});

          Chess.move(gameId, 115, 55, {from: player1, gas: 500000}); // check
        }, Error, 'block 2');
        assert.throws(() => {
          Chess.move(gameId, 3, 71, {from: player1, gas: 500000});
        }, Error, '', 'make move while in check 1');
        assert.doesNotThrow(() => {
          Chess.move(gameId, 4, 20, {from: player2, gas: 500000});

          Chess.move(gameId, 55, 52, {from: player1, gas: 500000}); // check
          Chess.move(gameId, 20, 21, {from: player2, gas: 500000});

          Chess.move(gameId, 117, 66, {from: player1, gas: 500000}); // check
        }, Error, 'block 3');
        assert.doesNotThrow(() => {
          Chess.move(gameId, 19, 51, {from: player2, gas: 500000});
        }, Error, 'prevent check with bishop');
        assert.doesNotThrow(() => {
          Chess.move(gameId, 66, 51, {from: player1, gas: 500000}); // check
          Chess.move(gameId, 21, 38, {from: player2, gas: 500000});

          Chess.move(gameId, 103, 71, {from: player1, gas: 500000});
          Chess.move(gameId, 23, 55, {from: player2, gas: 500000});

          Chess.move(gameId, 51, 17, {from: player1, gas: 500000});
          Chess.move(gameId, 2, 17, {from: player2, gas: 500000});

          Chess.move(gameId, 52, 53, {from: player1, gas: 500000}); // check
          Chess.move(gameId, 38, 39, {from: player2, gas: 500000});

          Chess.move(gameId, 99, 67, {from: player1, gas: 500000}); // check
        }, Error, 'block 4');
        assert.throws(() => {
          Chess.move(gameId, 3, 67, {from: player1, gas: 500000});
        }, Error, '', 'make move while in check 2');
        assert.doesNotThrow(() => {
          Chess.move(gameId, 22, 54, {from: player2, gas: 500000});

          Chess.move(gameId, 53, 21, {from: player1, gas: 500000});
          Chess.move(gameId, 5, 65, {from: player2, gas: 500000}); // check

          Chess.move(gameId, 98, 82, {from: player1, gas: 500000});
          Chess.move(gameId, 65, 82, {from: player2, gas: 500000}); // check

          Chess.move(gameId, 113, 82, {from: player1, gas: 500000});
          Chess.move(gameId, 1, 34, {from: player2, gas: 500000});

          Chess.move(gameId, 71, 54, {from: player1, gas: 500000}); // check
          Chess.move(gameId, 3, 54, {from: player2, gas: 500000});

          Chess.move(gameId, 119, 55, {from: player1, gas: 500000});
          // checkmate
        }, Error, 'block 4');
        assert.throws(() => {
          Chess.move(gameId, 54, 55, {from: player2, gas: 500000});
        }, Error, '', 'make move while checkmate');
      });

      describe('#valid', () => {
        it('should allow castling', () => {
          let state = [...defaultBoard];
          state[5] = 0;
          state[6] = 0;
          state[113] = 0;
          state[114] = 0;
          state[115] = 0;
          state[21] = 0;
          state[69] = -4; // B_R
          state[99] = 0;
          state[51] = 4; // W_R

          Chess.setGameState(gameId, state, player2, {from: player2, gas: 2000000});
          assert.doesNotThrow(() => {
            Chess.move(gameId, 4, 6, {from: player2, gas: 500000});
          });
          assert.doesNotThrow(() => {
            Chess.move(gameId, 116, 114, {from: player1, gas: 500000});
          });
        });

        it('should allow castling when other rook moved', () => {
          let state = [...defaultBoard];
          // clear black side
          state[1] = 0;
          state[2] = 0;
          state[3] = 0;
          state[5] = 0;
          state[6] = 0;
          // clean white side
          state[113] = 0;
          state[114] = 0;
          state[115] = 0;
          state[117] = 0;
          state[118] = 0;

          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.doesNotThrow(() => {
            Chess.move(gameId, 112, 113, {from: player1, gas: 500000});
            Chess.move(gameId, 7, 6, {from: player2, gas: 500000});
          });
          assert.doesNotThrow(() => {
            Chess.move(gameId, 116, 118, {from: player1, gas: 500000});
          }, Error);
          assert.doesNotThrow(() => {
            Chess.move(gameId, 4, 2, {from: player2, gas: 500000});
          }, Error);
        });

        it('should allow en passant', (done) => {
          let state = [...defaultBoard];
          state[100] = 0;
          state[52] = 1; // W_P

          Chess.setGameState(gameId, state, player2, {from: player1, gas: 2000000});
          assert.doesNotThrow(() => {
            Chess.move(gameId, 19, 51, {from: player2, gas: 500000});
          });
          assert.doesNotThrow(() => {
            Chess.move(gameId, 52, 35, {from: player1, gas: 500000});
          });
          // check if pawn was removed
          var filter = Chess.GameStateChanged({gameId: gameId});
          filter.watch((error, result) => {
            assert.equal(0, result.args.state[51]);
            filter.stopWatching();
            done();
          });
        });

        it('should allow pawn promotion', (done) => {
          let state = [...defaultBoard];
          // clear black side
          state[2] = 0;
          state[18] = 1; // W_P

          // clean white side
          state[114] = 0;
          state[98] = -1; // B_P


          // Watch for event from contract to check if it worked
          var filter = Chess.GameStateChanged({gameId: gameId});
          filter.watch((error, result) => {
            assert.equal('0', result.args.state[18].toString());
            assert.equal('5', result.args.state[2].toString());
            // TODO why there is only a event after the second move?
            assert.equal('0', result.args.state[98].toString());
            assert.equal('-5', result.args.state[114].toString());
            filter.stopWatching();
            done();
          });

          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.doesNotThrow(() => {
            Chess.move(gameId, 18, 2, {from: player1, gas: 500000});
            Chess.move(gameId, 98, 114, {from: player2, gas: 500000});
          });
        });
      });

      describe('#invalid', () => {
        it('should reject move when would be check', () => {
          let state = [...defaultBoard];
          state[65] = -3; // B_B
          state[71] = -5; // B_Q

          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.throws(function() {
            Chess.move(gameId, 99, 83, {from: player1, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 99, 67, {from: player1, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 101, 85, {from: player1, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 101, 69, {from: player1, gas: 500000});
          }, Error);
        });

        it('should reject king to move next to other king', () => {
          let state = [...emptyBoard];
          state[52] = -6; // B_K
          state[3 + 8] = 52; // B_K pos
          state[83] = 6; // W_K
          state[115 + 8] = 83; // W_K pos
          // not sure if king positions have to be set ~Kyroy
          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.throws(function() {
            Chess.move(gameId, 83, 67, {from: player1, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 83, 68, {from: player1, gas: 500000});
          }, Error);

          Chess.setGameState(gameId, state, player2, {from: player2, gas: 2000000});
          assert.throws(function() {
            Chess.move(gameId, 52, 67, {from: player2, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 52, 68, {from: player2, gas: 500000});
          }, Error);
        });

        it('should reject invalid moves after check through pawn promotion', () => {
          let state = [...defaultBoard];
          // clear black side
          state[1] = 0;
          state[2] = 0;
          state[3] = 0;

          // set pawn
          state[18] = 1; // W_P

          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.doesNotThrow(() => {
            Chess.move(gameId, 18, 2, {from: player1, gas: 500000});
            // check
          });
          assert.throws(() => {
            Chess.move(gameId, 98, 114, {from: player2, gas: 500000});
          }, Error);
          assert.doesNotThrow(() => {
            Chess.move(gameId, 0, 2, {from: player2, gas: 500000});
          });
        });

        it('should reject invalid moves when would be check after pawn promotion', () => {
          let state = [...defaultBoard];
          // clear black side
          state[2] = 0;
          state[19] = 0;

          // set pawn
          state[18] = 1; // W_P

          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.doesNotThrow(() => {
            Chess.move(gameId, 18, 2, {from: player1, gas: 500000});
          });
          assert.throws(() => {
            Chess.move(gameId, 3, 19, {from: player2, gas: 500000});
          }, Error);
          assert.throws(() => {
            Chess.move(gameId, 3, 51, {from: player2, gas: 500000});
          }, Error);
        });

        it('should reject castling with figure between', () => {
          let state = [...defaultBoard];
          // clear black side
          //state[1] = 0;
          state[2] = 0;
          state[3] = 0;
          //state[5] = 0;
          state[6] = 0;
          // clean white side
          //state[113] = 0;
          state[114] = 0;
          state[115] = 0;
          //state[117] = 0;
          state[118] = 0;

          // black
          Chess.setGameState(gameId, state, player2, {from: player1, gas: 2000000});
          assert.throws(function() {
            Chess.move(gameId, 4, 6, {from: player2, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 4, 2, {from: player2, gas: 500000});
          }, Error);

          // white
          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.throws(function() {
            Chess.move(gameId, 116, 118, {from: player1, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 116, 114, {from: player1, gas: 500000});
          }, Error);
        });

        it('should reject castling when king moved', () => {
          let state = [...defaultBoard];
          // clear black side
          state[1] = 0;
          state[2] = 0;
          state[3] = 0;
          state[5] = 0;
          state[6] = 0;
          // clean white side
          state[113] = 0;
          state[114] = 0;
          state[115] = 0;
          state[117] = 0;
          state[118] = 0;

          // black
          Chess.setGameState(gameId, state, player2, {from: player1, gas: 2000000});
          assert.doesNotThrow(() => {
            Chess.move(gameId, 4, 3, {from: player2, gas: 500000});

            Chess.move(gameId, 96, 64, {from: player1, gas: 500000});
            Chess.move(gameId, 3, 4, {from: player2, gas: 500000});

            Chess.move(gameId, 97, 81, {from: player1, gas: 500000});
          });
          assert.throws(function() {
            Chess.move(gameId, 4, 6, {from: player2, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 4, 2, {from: player2, gas: 500000});
          }, Error);

          // white
          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.doesNotThrow(() => {
            Chess.move(gameId, 116, 115, {from: player1, gas: 500000});
            Chess.move(gameId, 16, 48, {from: player2, gas: 500000});

            Chess.move(gameId, 115, 116, {from: player1, gas: 500000});
            Chess.move(gameId, 17, 33, {from: player2, gas: 500000});
          });
          assert.throws(function() {
            Chess.move(gameId, 116, 118, {from: player1, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 116, 114, {from: player1, gas: 500000});
          }, Error);
        });

        it('should reject castling when rook moved', () => {
          let state = [...defaultBoard];
          // clear black side
          state[1] = 0;
          state[2] = 0;
          state[3] = 0;
          state[5] = 0;
          state[6] = 0;
          // clean white side
          state[113] = 0;
          state[114] = 0;
          state[115] = 0;
          state[117] = 0;
          state[118] = 0;

          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.doesNotThrow(() => {
            Chess.move(gameId, 112, 113, {from: player1, gas: 500000});
            Chess.move(gameId, 7, 6, {from: player2, gas: 500000});
          });
          assert.throws(() => {
            Chess.move(gameId, 116, 114, {from: player1, gas: 500000});
          }, Error);
          assert.doesNotThrow(() => {
            Chess.move(gameId, 113, 112, {from: player1, gas: 500000});
          });
          assert.throws(() => {
            Chess.move(gameId, 4, 6, {from: player2, gas: 500000});
          }, Error);
          assert.doesNotThrow(() => {
            Chess.move(gameId, 6, 7, {from: player2, gas: 500000});
          }, Error);
          assert.throws(() => {
            Chess.move(gameId, 116, 114, {from: player1, gas: 500000});
          }, Error);
          assert.doesNotThrow(() => {
            Chess.move(gameId, 96, 64, {from: player1, gas: 500000});
          }, Error);
          assert.throws(() => {
            Chess.move(gameId, 4, 6, {from: player2, gas: 500000});
          }, Error);

        });

        it('should reject castling over check', () => {
          let state = [...defaultBoard];
          // clear black side
          state[1] = 0;
          state[2] = 0;
          state[3] = 0;
          state[5] = 0;
          state[6] = 0;
          // clean white side
          state[113] = 0;
          state[114] = 0;
          state[115] = 0;
          state[117] = 0;
          state[118] = 0;

          // clear pawns
          state[21] = 0;
          state[19] = 0;
          state[99] = 0;
          state[101] = 0;

          state[53] = 4; // W_R
          state[51] = 4; // W_R
          state[69] = -4; // B_R
          state[67] = -4; // B_R

          // black
          Chess.setGameState(gameId, state, player2, {from: player1, gas: 2000000});
          assert.throws(function() {
            Chess.move(gameId, 4, 6, {from: player2, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 4, 2, {from: player2, gas: 500000});
          }, Error);

          // white
          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.throws(function() {
            Chess.move(gameId, 116, 118, {from: player1, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 116, 114, {from: player1, gas: 500000});
          }, Error);
        });

        it('should reject castling when check 1', () => {
          let state = [...defaultBoard];
          // clear black side
          state[1] = 0;
          state[2] = 0;
          state[3] = 0;
          state[5] = 0;
          state[6] = 0;
          // clean white side
          state[113] = 0;
          state[114] = 0;
          state[115] = 0;
          state[117] = 0;
          state[118] = 0;

          // clear pawns
          state[20] = 0;
          state[100] = 0;

          state[52] = 4; // W_R
          state[68] = -4; // B_R

          // black
          Chess.setGameState(gameId, state, player2, {from: player1, gas: 2000000});
          assert.throws(function() {
            Chess.move(gameId, 4, 6, {from: player2, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 4, 2, {from: player2, gas: 500000});
          }, Error);

          // white
          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.throws(function() {
            Chess.move(gameId, 116, 118, {from: player1, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 116, 114, {from: player1, gas: 500000});
          }, Error);
        });

        it('should reject castling when check 2', () => {
          let state = [...defaultBoard];
          // clear black side
          state[1] = 0;
          state[2] = 0;
          state[3] = 0;
          state[5] = 0;
          state[6] = 0;
          // clean white side
          state[113] = 0;
          state[114] = 0;
          state[115] = 0;
          state[117] = 0;
          state[118] = 0;

          // clear pawns
          state[21] = 0;
          state[99] = 0;

          state[55] = 3; // W_B
          state[48] = -3; // B_B

          // black
          Chess.setGameState(gameId, state, player2, {from: player1, gas: 2000000});
          assert.throws(function() {
            Chess.move(gameId, 4, 6, {from: player2, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 4, 2, {from: player2, gas: 500000});
          }, Error);

          // white
          Chess.setGameState(gameId, state, player1, {from: player1, gas: 2000000});
          assert.throws(function() {
            Chess.move(gameId, 116, 118, {from: player1, gas: 500000});
          }, Error);
          assert.throws(function() {
            Chess.move(gameId, 116, 114, {from: player1, gas: 500000});
          }, Error);
        });

        it('should reject later en passant', () => {
          let state = [...defaultBoard];
          state[100] = 0;
          state[52] = 1; // W_P

          Chess.setGameState(gameId, state, player2, {from: player1, gas: 2000000});
          assert.doesNotThrow(() => {
            Chess.move(gameId, 19, 51, {from: player2, gas: 500000});
          });
          assert.doesNotThrow(() => {
            Chess.move(gameId, 96, 64, {from: player1, gas: 500000});
            Chess.move(gameId, 21, 53, {from: player2, gas: 500000});
          });
          assert.throws(() => {
            Chess.move(gameId, 52, 35, {from: player1, gas: 500000});
          }, Error);
        });

        it('should reject invalid en passant', () => {
          assert.doesNotThrow(() => {
            Chess.move(gameId, 100, 68, {from: player1, gas: 500000});
            Chess.move(gameId, 19, 51, {from: player2, gas: 500000});

            Chess.move(gameId, 68, 52, {from: player1, gas: 500000});
          });
          assert.throws(() => {
            Chess.move(gameId, 51, 68, {from: player2, gas: 500000});
          }, Error);
        });
      });
    });
  });

  // log game state changes
  /* Debugging
  var filter = Chess.GameStateChanged({});
  filter.watch(function(error, result){
    console.log(result.args.gameId, 'Game state changed');
    displayGameState(result.args.state);
    filter.stopWatching();
  }); */

});
