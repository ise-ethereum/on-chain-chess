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

      Chess.initGame(player2, {from: player1, gas: 1000000});

      var filter = Chess.GameInitialized({});
      filter.watch(function(error, result){
        gameId = result.args.gameId;
        assert.isOk(result.args.gameId);
        filter.stopWatching();
        done();
      });
    });
  });

  describe('move()', function () {
    it('should throw an exception on an invalid move', function() {
      assert.throws(function(){
        Chess.move(gameId, {from: player1, gas: 100000});
      }, Error);
    });
    it('should accept a valid move', function(done) {
      this.timeout(10000);
      assert.doesNotThrow(function(){
        Chess.move(gameId, {from: player2, gas: 100000});
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
