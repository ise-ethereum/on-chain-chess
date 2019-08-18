pragma solidity 0.5.10;

/**
 * Chess contract
 * Stores any amount of games with two players and current state.
 * State encoding:
 *    positive numbers for white, negative numbers for black
 *    for details, see
 *    https://github.com/Fede5mentarios/on-chain-chess
 */

import "./TurnBasedGame.sol";
import "./ChessLogic.sol";
import "./Auth.sol";
import "./ELO.sol";

contract EventfullChess {
  event GameInitialized(bytes32 indexed gameId, address indexed player1, string player1Alias, address playerWhite, uint turnTime, uint pot);
  event GameJoined(
    bytes32 indexed gameId,
    address indexed player1,
    string player1Alias,
    address indexed player2,
    string player2Alias,
    address playerWhite,
    uint pot
  );
  event GameStateChanged(bytes32 indexed gameId, int8[128] state);
  event Move(bytes32 indexed gameId, address indexed player, uint256 fromIndex, uint256 toIndex);
  event EloScoreUpdate(address indexed player, uint score);
}

contract Chess is Auth, EventfulChess, TurnBasedGame {
  using ChessLogic for ChessLogic.State;
  mapping (bytes32 => ChessLogic.State) gameStates;

  using ELO for ELO.Scores;
  ELO.Scores eloScores;

  function getEloScore(address player) public view returns(uint) {
    return eloScores.getScore(player);
  }

  function Chess(bool enableDebugging) TurnBasedGame(enableDebugging) {
  }

  /**
    * Initialize a new game
    * string player1Alias: Alias of the player creating the game
    * bool playAsWhite: Pass true or false depending on if the creator will play as white
    */
  function initGame(string player1Alias, bool playAsWhite, uint turnTime) public returns (bytes32) {
    bytes32 gameId = super.initGame(player1Alias, playAsWhite, turnTime);

    // Setup game state
    int8 nextPlayerColor = int8(1);
    gameStates[gameId].setupState(nextPlayerColor);
    if (playAsWhite) {
        // Player 1 will play as white
        gameStates[gameId].playerWhite = msg.sender;

        // Game starts with White, so here player 1
        games[gameId].nextPlayer = games[gameId].player1;
    }

    // Sent notification events
    GameInitialized(gameId, games[gameId].player1, player1Alias, gameStates[gameId].playerWhite, games[gameId].turnTime, games[gameId].pot);
    GameStateChanged(gameId, gameStates[gameId].fields);
    return gameId;
  }

  /**
    * Join an initialized game
    * bytes32 gameId: ID of the game to join
    * string player2Alias: Alias of the player that is joining
    */
  function joinGame(bytes32 gameId, string player2Alias) public {
    super.joinGame(gameId, player2Alias);

    // If the other player isn't white, player2 will play as white
    if (gameStates[gameId].playerWhite == 0) {
      gameStates[gameId].playerWhite = msg.sender;
      // Game starts with White, so here player2
      games[gameId].nextPlayer = games[gameId].player2;
    }

    emit GameJoined(
      gameId,
      games[gameId].player1,
      games[gameId].player1Alias,
      games[gameId].player2,
      player2Alias,
      gameStates[gameId].playerWhite,
      games[gameId].pot
    );
  }

  /**
    *
    * verify signature of state
    * verify signature of move
    * apply state, verify move
    */
  function moveFromState(bytes32 gameId, int8[128] state, uint256 fromIndex, uint256 toIndex, bytes sigState) notEnded(gameId) public {
    // check whether sender is a member of this game
    if (games[gameId].player1 != msg.sender && games[gameId].player2 != msg.sender) {
      throw;
    }
    // find opponent to msg.sender
    address opponent;
    if (msg.sender == games[gameId].player1) {
      opponent = games[gameId].player2;
    } else {
      opponent = games[gameId].player1;
    }

    // verify state - should be signed by the other member of game - not mover
    if (!verifySig(opponent, sha3(state, gameId), sigState)) {
      throw;
    }

    // check move count. New state should have a higher move count.
    if ((state[8] * int8(128) + state[9]) < (gameStates[gameId].fields[8] * int8(128) + gameStates[gameId].fields[9])) {
      throw;
    }

    int8 playerColor = msg.sender == gameStates[gameId].playerWhite ? int8(1) : int8(-1);

    // apply state
    gameStates[gameId].setState(state, playerColor);
    games[gameId].nextPlayer =  msg.sender;

    // apply and verify move
    move(gameId, fromIndex, toIndex);
  }

  function move(bytes32 gameId, uint256 fromIndex, uint256 toIndex) notEnded(gameId) public {
    if (games[gameId].timeoutState == 2 &&
      now >= games[gameId].timeoutStarted + games[gameId].turnTime * 1 minutes &&
      msg.sender != games[gameId].nextPlayer) {
      // Just a fake move to determine if there is a possible move left for timeout

      // Chess move validation
      gameStates[gameId].move(fromIndex, toIndex, msg.sender != gameStates[gameId].playerWhite);
    } else {
      if (games[gameId].nextPlayer != msg.sender) {
        throw;
      }
      if (games[gameId].timeoutState != 0) {
        games[gameId].timeoutState = 0;
      }

      // Chess move validation
      gameStates[gameId].move(fromIndex, toIndex, msg.sender == gameStates[gameId].playerWhite);

      // Set nextPlayer
      if (msg.sender == games[gameId].player1) {
        games[gameId].nextPlayer = games[gameId].player2;
      } else {
        games[gameId].nextPlayer = games[gameId].player1;
      }
    }

    // Send events
    emit Move(gameId, msg.sender, fromIndex, toIndex);
    emit GameStateChanged(gameId, gameStates[gameId].fields);
  }

  /* Explicit set game state. Only in debug mode */
  function setGameState(bytes32 gameId, int8[128] state, address nextPlayer) debugOnly public {
    int8 playerColor = nextPlayer == gameStates[gameId].playerWhite ? int8(1) : int8(-1);
    gameStates[gameId].setState(state, playerColor);
    games[gameId].nextPlayer = nextPlayer;
    GameStateChanged(gameId, gameStates[gameId].fields);
  }

  function getCurrentGameState(bytes32 gameId) public view returns (int8[128]) {
    return gameStates[gameId].fields;
  }

  function getWhitePlayer(bytes32 gameId) public view returns (address) {
    return gameStates[gameId].playerWhite;
  }

  function surrender(bytes32 gameId) public notEnded(gameId) {
    super.surrender(gameId);

    // Update ELO scores
    var game = games[gameId];
    eloScores.recordResult(game.player1, game.player2, game.winner);
    emit EloScoreUpdate(game.player1, eloScores.getScore(game.player1));
    emit EloScoreUpdate(game.player2, eloScores.getScore(game.player2));
  }

  /* The sender claims he has won the game. Starts a timeout. */
  function claimWin(bytes32 gameId) public notEnded(gameId) {
    super.claimWin(gameId);

    // get the color of the player that wants to claim win
    int8 otherPlayerColor = gameStates[gameId].playerWhite == msg.sender ? int8(-1) : int8(1);

    // We get the king position of that player
    uint256 kingIndex = uint256(gameStates[gameId].getOwnKing(otherPlayerColor));

    // if he is not in check, the request is illegal
    if (!gameStates[gameId].checkForCheck(kingIndex, otherPlayerColor)){
      throw;
    }
  }

  /**
    * The sender (currently waiting player) claims that the other (turning)
    * player timed out and has to provide a move, the other player could
    * have done to prevent the timeout.
    */
  function claimTimeoutEndedWithMove(bytes32 gameId, uint256 fromIndex, uint256 toIndex) public notEnded(gameId) {
    var game = games[gameId];
    // just the two players currently playing
    if (msg.sender != game.player1 && msg.sender != game.player2)
      throw;
    if (now < game.timeoutStarted + game.turnTime * 1 minutes)
      throw;
    if (msg.sender == game.nextPlayer)
      throw;
    if (game.timeoutState != 2)
      throw;

    // TODO we need other move function
    // move is valid if it does not throw
    move(gameId, fromIndex, toIndex);

    game.ended = true;
    game.winner = msg.sender;
    if (msg.sender == game.player1) {
      games[gameId].player1Winnings = games[gameId].pot;
      games[gameId].pot = 0;
    } else {
      games[gameId].player2Winnings = games[gameId].pot;
      games[gameId].pot = 0;
    }

    // Update ELO scores
    eloScores.recordResult(game.player1, game.player2, game.winner);
    emit EloScoreUpdate(game.player1, eloScores.getScore(game.player1));
    emit EloScoreUpdate(game.player2, eloScores.getScore(game.player2));
    GameEnded(gameId);
  }

  /* The sender claims a previously started timeout. */
  function claimTimeoutEnded(bytes32 gameId) notEnded(gameId) public {
    super.claimTimeoutEnded(gameId);

    // Update ELO scores
    var game = games[gameId];
    eloScores.recordResult(game.player1, game.player2, game.winner);
    emit EloScoreUpdate(game.player1, eloScores.getScore(game.player1));
    emit EloScoreUpdate(game.player2, eloScores.getScore(game.player2));
  }

  /* A timeout can be confirmed by the non-initializing player. */
  function confirmGameEnded(bytes32 gameId) notEnded(gameId) public {
    super.confirmGameEnded(gameId);

    // Update ELO scores
    var game = games[gameId];
    eloScores.recordResult(game.player1, game.player2, game.winner);
    emit EloScoreUpdate(game.player1, eloScores.getScore(game.player1));
    emit EloScoreUpdate(game.player2, eloScores.getScore(game.player2));
  }

  /* This unnamed function is called whenever someone tries to send ether to the contract */
  function () public {
    throw; // Prevents accidental sending of ether
  }
}
