/**
 * Contract to test ELO implementation
 */

import "ELO.sol";

contract EloTest {
    using ELO for ELO.Scores;
    ELO.Scores eloScores;

    event EloScoreUpdate(address player, uint score);

    function EloTest() { }

    function recordResult(address player1, address player2, address winner) {
        eloScores.recordResult(player1, player2, winner);
        EloScoreUpdate(player1, eloScores.getScore(player1));
        EloScoreUpdate(player2, eloScores.getScore(player2));
    }
}
