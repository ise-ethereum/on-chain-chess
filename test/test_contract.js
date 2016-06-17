/* global describe, it, beforeEach */
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
const emptyBoard = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];


describe('Chess contract', function() {
  this.timeout(60000);
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

        // Watch for event from contract to check if it worked
        var filter = Chess.Move({gameId: testGames[0]});
        filter.watch(function (error, result) {
          assert.equal(player1, result.args.player);
          assert.equal(100, result.args.fromIndex);
          assert.equal(84, result.args.toIndex);
          filter.stopWatching(); // Need to remove filter again
          done();
        });
      });

      it('should have updated nextPlayer after the previous move', function () {
        assert.throws(function () {
          // Cannot move again from player1 because nextPlayer will be player2
          Chess.move(testGames[0], 84, 68, {from: player1, gas: 500000});
        }, Error);
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
        let state = [...defaultBoard];
        state[32] = -6; // Black king on a2
        state[67] = 5; // White queen on d4
        Chess.setGameState(testGames[0], state, player1, {from: player1, gas: 2000000});
        var filter = Chess.GameStateChanged({gameId: testGames[0]});
        filter.watch(function (error, result) {
          //console.log(gameStateDisplay(state));
          assert.deepEqual(gameStateDisplay(state), gameStateDisplay(result.args.state));
          filter.stopWatching(); // Need to remove filter again

          assert.doesNotThrow(function () {
            // white queen d4c4 -- Queen move that checks black king on a6
            Chess.move(testGames[0], 67, 66, {from: player1, gas: 500000});
          }, Error);

          done();
        });
      });
    });

    describe('#validation', () => {
      let gameId;

      beforeEach((done) => {
        // runs before each test in this block
        Chess.initGame('Alice', true, {from: player1, gas: 2000000});

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

      describe.only('#valid', () => {
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
          assert.throws(() => {
            Chess.move(gameId, 4, 6, {from: player2, gas: 500000});
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

        it('should allow pawn promotion');
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

        it('should reject invalid moves after check through pawn promotion');

        it('should reject invalid moves when would be check after pawn promotion');

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

        it('should reject pawn promotion to king or pawn');
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


