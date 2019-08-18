pragma solidity 0.5.10;

/**
 * Contract to test ELO implementation
 */

import "./ELO.sol";

contract EloTest {
  using ELO for ELO.Scores;
  ELO.Scores eloScores;

  event EloScoreUpdate(address player, uint score);

  function recordResult(address player1, address player2, address winner) public {
    eloScores.recordResult(player1, player2, winner);
    emit EloScoreUpdate(player1, eloScores.getScore(player1));
    emit EloScoreUpdate(player2, eloScores.getScore(player2));
  }
}
