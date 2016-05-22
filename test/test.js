/* global describe, it */
import { Chess, web3 } from '../contract/Chess.sol';

var assert = require('chai').assert;

describe('Chess', function() {
  var gameId;
  const player1 = web3.eth.accounts[0];
  const player2 = web3.eth.accounts[1];

  describe('initGame()', function () {
    it('should initialize a game between two players', function (done) {
      this.timeout(10000);

      Chess.initGame('Alice', {from: player1, gas: 1000000});

      var filter = Chess.GameInitialized({});
      filter.watch(function(error, result){
        gameId = result.args.gameId;
        assert.isOk(result.args.gameId);
        assert.equal('Alice', result.args.player1Alias);
        filter.stopWatching();
        done();
      });
    });
  });

  describe('joinGame()', function () {
    it('should join player2', function(done) {
      this.timeout(10000);

      assert.doesNotThrow(function(){
        Chess.joinGame(gameId, 'Bob', {from: player2, gas: 1000000});
      }, Error);

      var filter = Chess.GameJoined({});
      filter.watch(function(error, result){
        assert.equal(gameId, result.args.gameId);
        assert.equal(player2, result.args.player2);
        assert.equal('Bob', result.args.player2Alias);
        filter.stopWatching();
        done();
      });
    });
    it('should disallow joing a game with two payers', function() {
      this.timeout(10000);

      assert.throws(function(){
        Chess.joinGame(gameId, 'Bob', {from: player2, gas: 100000});
      }, Error);
    });
  });

  describe('move()', function () {
    it('should throw an exception on an invalid move', function() {
      assert.throws(function(){
        Chess.move(gameId, {from: player2, gas: 100000});
      }, Error);
    });
    it('should accept a valid move', function(done) {
      this.timeout(10000);

      assert.doesNotThrow(function(){
        Chess.move(gameId, {from: player1, gas: 100000});
      }, Error);

      var filter = Chess.Move({});
      filter.watch(function(error, result){
        assert.isTrue(result.args.moveSuccesful);
        filter.stopWatching();
        done();
      });
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
