/* global describe, it */
import { Chess, web3 } from '../contract/Chess.sol';

var assert = require('chai').assert;

const defaultBoard = [-4,-2,-3,-5,-6,-3,-2,-4,0,0,0,0,0,0,0,0,
                      -1,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                      1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
                      4,2,3,5,6,3,2,4,0,0,0,0,0,0,0,0];

describe('Chess contract', function() {
  this.timeout(10000);
  this.slow(500);

  var testGames = [];
  const player1 = web3.eth.accounts[0];
  const player2 = web3.eth.accounts[1];
  const player3 = web3.eth.accounts[2];

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
        assert.deepEqual(defaultBoard, state);
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
  });

  describe('joinGame()', function () {
    it('should join player2 as black if player1 is white', function(done) {
      assert.doesNotThrow(function(){
        Chess.joinGame(testGames[0], 'Bob', {from: player2, gas: 200000});
      }, Error);

      // Watch for event from contract to check if it worked
      var filter = Chess.GameJoined({});
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
        Chess.joinGame(testGames[0], 'Bob', {from: player2, gas: 100000});
      }, Error);
    });

    it('should join player2 as white if player1 is black', function(done) {
      assert.doesNotThrow(function(){
        Chess.joinGame(testGames[1], 'Bob', {from: player2, gas: 200000});
      }, Error);

      // Watch for event from contract to check if it worked
      var filter = Chess.GameJoined({});
      filter.watch(function(error, result){
        assert.equal(testGames[1], result.args.gameId);
        assert.equal(player2, result.args.playerWhite);
        filter.stopWatching(); // Need to remove filter again
        done();
      });
    });
  });

  describe('move()', function () {
    it('should throw an exception when it is not this player\'s turn', function() {
      assert.throws(function(){
        Chess.move(testGames[0], 0, 0, {from: player2, gas: 100000});
      }, Error);
    });

    it('should throw an exception when player with color black starts', function() {
      assert.throws(function(){
        Chess.move(testGames[1], 0, 0, {from: player1, gas: 100000});
      }, Error);
    });

    it('should accept a valid move', function(done) {
      // As player1 is the next player, this move should be valid
      assert.doesNotThrow(function(){
        Chess.move(testGames[0], 99, 83, {from: player1, gas: 100000});
      }, Error);

      // Watch for event from contract to check if it worked
      var filter = Chess.Move({});
      filter.watch(function(error, result){
        assert.equal(player1, result.args.player);
        assert.equal(99, result.args.fromIndex);
        assert.equal(83, result.args.toIndex);
        filter.stopWatching(); // Need to remove filter again
        done();
      });
    });

    it('should have updated nextPlayer after the previous move', function() {
      assert.throws(function(){
        // Cannot move again from player1 because nextPlayer will be player2
        Chess.move(testGames[0], 0, 0, {from: player1, gas: 100000});
      }, Error);
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

        Chess.joinGame(gameId, 'Bob', {from: player2, gas: 200000});
        var filter2 = Chess.GameJoined({gameId: gameId});
        filter2.watch(function(){
          filter2.stopWatching();
          done();
        });
      });
    });

    it('should throw an exception for message from non-participant', function() {
      assert.throws(function(){
        Chess.surrender(gameId, {from: player3, gas: 100000});
      }, Error);
    });

    it('should allow surrender from P1 and declare P2 as winner', function(done) {
      Chess.surrender(gameId, {from: player1, gas: 100000});
      var filter = Chess.GameEnded({gameId: gameId});
      filter.watch(function(error, result){
        assert.equal(player2, result.args.winner);
        filter.stopWatching();
        done();
      });
    });

    it('should throw an exception when surrendering a game that already ended', function() {
      assert.throws(function(){
        Chess.surrender(gameId, {from: player2, gas: 100000});
      }, Error);
    });
  });

  // log game state changes
  /* Debugging
  var filter = Chess.GameStateChanged({});
  filter.watch(function(error, result){
    var rows = [];
    console.log(result.args.gameId, 'Game state changed');
    for (var i = 0; i < 8; i++) {
      var row = [];
      for (var j = 0; j < 8; j++) {
        row.push(result.args.state[i*8+j].toString(10));
      }
      rows.push(row.join(' '));
    }
    console.log(rows);
    filter.stopWatching();
  });
  */
});
