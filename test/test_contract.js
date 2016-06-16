/* global describe, it */
import { Chess, web3 } from '../contract/Chess.sol';
import { gameStateDisplay } from './utils';

var assert = require('chai').assert;

const defaultBoard = [-4,-2,-3,-5,-6,-3,-2,-4,0,0,0,4,0,0,0,0,
                      -1,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                      1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
                      4,2,3,5,6,3,2,4,0,0,0,116,0,0,0,0];

describe('Chess contract', function() {
  this.timeout(10000);
  this.slow(500);

  var testGames = [];
  const player1 = web3.eth.accounts[0];
  const player2 = web3.eth.accounts[1];
  const player3 = web3.eth.accounts[2];

  // Remove this for CI/deploy, otherwise the test never finishes
  /*
  var debugFilter = Chess.DebugInts({});
  debugFilter.watch(function(error, result){
    console.log(result.args.message,
                result.args.value1.toNumber(),
                result.args.value2.toNumber(),
                result.args.value3.toNumber());
  });
  */

  // We create a few test games here that will later be accessed in testGames[]
  describe('initGame()', function () {
    it('should initialize a game with player1 playing white', function (done) {
      Chess.initGame('Alice', true, {from: player1, gas: 2000000});

      // Watch for event from contract to check if it worked
      var filter = Chess.GameInitialized({});
      filter.watch(function(error, result){
        testGames[0] = result.args.gameId;
        assert.isOk(result.args.gameId);
        assert.equal('Alice', result.args.player1Alias);
        assert.equal(player1, result.args.player1);
        assert.equal(player1, result.args.playerWhite);
        filter.stopWatching(); // Need to remove filter again
        done();
      });
    });

    it('should broadcast the initial game state', function(done) {
      Chess.initGame('Bob', true, {from: player1, gas: 2000000});

      var eventGamestate = Chess.GameStateChanged({});
      eventGamestate.watch(function(error, result){
        let state = result.args.state.map(n => n.toNumber());
        assert.deepEqual(gameStateDisplay(defaultBoard), gameStateDisplay(state));
        eventGamestate.stopWatching(); // Need to remove filter again
        done();
      });
    });

    it('should initialize a game with player1 playing black', function (done) {
      Chess.initGame('Susan', false, {from: player1, gas: 2000000});

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
    });

    it('should have set game state to not ended', function() {
      assert.isFalse(Chess.games(testGames[0])[7]);
    });

    it('should have set gamesOfPlayers', () => {
      assert.isTrue(Chess.getGamesOfPlayer(player1).indexOf(testGames[0]) !== -1);
      assert.isTrue(Chess.getGamesOfPlayer(player1).indexOf(testGames[1]) !== -1);
    });
  });

  describe('joinGame()', function () {
    it('should join player2 as black if player1 is white', function(done) {
      assert.doesNotThrow(function(){
        Chess.joinGame(testGames[0], 'Bob', {from: player2, gas: 500000});
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
      assert.isFalse(Chess.games(testGames[0])[7]);
      assert.isFalse(Chess.games(testGames[1])[7]);
    });

    it('should have set gamesOfPlayers', () => {
      assert.isTrue(Chess.getGamesOfPlayer(player2).indexOf(testGames[0]) !== -1);
      assert.isTrue(Chess.getGamesOfPlayer(player2).indexOf(testGames[1]) !== -1);
    });
  });

  describe('closePlayerGame()', function () {
    let gameId, gameId2;
    it('should initialize a game with 1 player only', function(done) {
      Chess.initGame('Alice', true, {from: player1, gas: 2000000});

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
      assert.isTrue(Chess.games(gameId)[7]);
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

    // next test
    it('should initialize 4 open games', () => {
      assert.doesNotThrow(() => {
        Chess.initGame('Alice', true, {from: player1, gas: 2000000});
        Chess.initGame('Alice', true, {from: player1, gas: 2000000});
        Chess.initGame('Alice', true, {from: player1, gas: 2000000});
        Chess.initGame('Alice', true, {from: player1, gas: 2000000});
      });
    });

    it('should initialize 1 open game (gameId2)', (done) => {
      Chess.initGame('Alice', true, {from: player1, gas: 2000000});
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
      Chess.initGame('Alice', true, {from: player1, gas: 2000000});
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
      Chess.initGame('Alice', true, {from: player1, gas: 2000000});
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
      Chess.initGame('Alice', true, {from: player1, gas: 2000000});
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
      Chess.initGame('Alice', true, {from: player1, gas: 2000000});
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
    it('should be able to close a open game', () => {
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

  describe('move()', function () {
    it('should throw an exception when it is not this player\'s turn', function() {
      assert.throws(function(){
        Chess.move(testGames[0], 0, 0, {from: player2, gas: 500000});
      }, Error);
    });

    it('should throw an exception when P1 is black, so they cannot move first', function() {
      assert.throws(function(){
        Chess.move(testGames[1], 0, 0, {from: player1, gas: 500000});
      }, Error);
    });

    it('should throw an exception when a move is invalid', function() {
      // Test some invalid moves, but from correct player
      assert.throws(function(){
        // white pawn a7a7
        Chess.move(testGames[0], 96, 96, {from: player1, gas: 500000});
      }, Error);

      assert.throws(function(){
        // white rook a8a7
        Chess.move(testGames[0], 112, 96, {from: player1, gas: 500000});
      }, Error);

      // TODO: Add more invalid moves
    });

    it('should accept a valid move', function(done) {
      // As player1 is the next player, this move should be valid
      assert.doesNotThrow(function(){
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
      expectedState[8] = 1 >> 7; // updated move count
      expectedState[9] = 1 % 128; // updated move count
      var filter2 = Chess.GameStateChanged({gameId: testGames[0]});
      filter2.watch(function(error, result){
        assert.deepEqual(gameStateDisplay(expectedState), gameStateDisplay(result.args.state));
        filter2.stopWatching(); // Need to remove filter again
        allDone();
      });
    });

    it('should have updated nextPlayer after the previous move', function() {
      assert.throws(function(){
        // Cannot move again from player1 because nextPlayer will be player2
        Chess.move(testGames[0], 84, 68, {from: player1, gas: 500000});
      }, Error);
    });

    it('should accept valid moves', function() {
      // Test for several other valid moves
      assert.doesNotThrow(function(){
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

    it('should set game state and accept valid move', function(done) {
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
        // The second event occurs after the move and should have updated the game state accordingly
        if (numDone === 1) {
          newState[66] = newState[67]; // Piece was moved
          newState[67] = 0;
          newState[8] = 128 >> 7; // = 1, Move count has overflown
          newState[9] = 128 % 128;
          assert.deepEqual(gameStateDisplay(newState), gameStateDisplay(result.args.state));
          filter.stopWatching(); // Need to remove filter again
        }
        oneDone();
      });
    });
  });

  describe('surrender()', function () {
    // Setup a new game for this test
    let gameId;
    it('should initialize a new game and join both players', function(done) {
      Chess.initGame('Bob', true, {from: player1, gas: 2000000});
      var filter = Chess.GameInitialized({});
      filter.watch(function(error, result){
        gameId = result.args.gameId;
        filter.stopWatching();

        Chess.joinGame(gameId, 'Bob', {from: player2, gas: 500000});
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
      filter.watch(function(error, result){
        assert.equal(player2, result.args.winner);
        filter.stopWatching();
        done();
      });
    });

    it('should have set game state to ended', function() {
      assert.isTrue(Chess.games(gameId)[7]);
    });

    it('should throw an exception when surrendering a game that already ended', function() {
      assert.throws(function(){
        Chess.surrender(gameId, {from: player2, gas: 500000});
      }, Error);
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


