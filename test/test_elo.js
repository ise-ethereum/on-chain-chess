/* global describe, it */
import { EloTest, web3 } from '../contract/EloTest.sol';
import { Plan } from './utils.js';

var assert = require('chai').assert;
var async = require('async');


describe('ELO library', function() {
  this.timeout(50000);
  this.slow(500);
  const player1 = web3.eth.accounts[0];
  const player2 = web3.eth.accounts[1];
  web3.eth.defaultAccount = player1;

  describe('Recording game result', function () {
    it('correctly initialize scores with floor and record win of P1', function (done) {
      EloTest.recordResult(player1, player2, player1, {gas: 500000});

      let filter = EloTest.EloScoreUpdate({});
      let plan = new Plan(2, () => {
        filter.stopWatching();
        done();
      });
      filter.watch(function(error, result){
        if (result.args.player === player1) {
          assert.equal(110, result.args.score.toNumber());
        }
        if (result.args.player === player2) {
          assert.equal(100, result.args.score.toNumber());
        }
        plan.ok();
      });
    });

    it('correctly record a number of games', function (done) {
      let results = [
        // winner, new score player 1, new score player 2
        // Start: 110, 100
        [player1, 120, 100],  // +10, -10   (floored at 100)
        [player1, 129, 100],  //  +9,  -9
        [player1, 138, 100],  //  +9,  -9
        [player1, 147, 100],  //  +9,  -9
        [player2, 138, 111],  //  -9, +11
        [player2, 129, 122],  //  -9, +11
        [player1, 139, 112],  // +10, -10
        [player1, 148, 101],  //  +9, -11
        [player1, 157, 100],  //  +9,  -9
        [player1, 165, 100],  //  +8,  -8
        [player1, 173, 100],  //  +8,  -8
        [player1, 181, 100],  //  +8,  -8
        [player2, 173, 112],  //  -8, +12
        [0,       171, 114],  //  -2,  +2
        [player2, 163, 126],  //  -8, +12
        [player2, 154, 137],  //  -9, +11
        [player2, 144, 147],  // -10, +10
        [0,       144, 147],  //  -0,  +0
      ];

      // Test a couple of results after each other
      async.mapSeries(results, (item, callback) => {
        let [winner, score1, score2] = item;
        EloTest.recordResult(player1, player2, winner, {gas: 500000});
        let filter = EloTest.EloScoreUpdate({});
        let plan = new Plan(2, () => {
          filter.stopWatching();
          callback();
        });
        filter.watch(function(error, result){
          if (result.args.player === player1) {
            let resultText = (winner === player1 ? 'winning' : (!winner?'draw':'losing'));
            let msg = 'After ' + resultText + ', player 1 score should be ' + score1;
            assert.equal(score1, result.args.score.toNumber(), msg);
          }
          if (result.args.player === player2) {
            let resultText = (winner === player2 ? 'winning' : (!winner?'draw':'losing'));
            let msg = 'After ' + resultText + ', player 2 score should be ' + score2;
            assert.equal(score2, result.args.score.toNumber(), msg);
          }
          plan.ok();
        });
      }, done);
    });
  });
});
