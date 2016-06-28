/**
 * Chess contract
 * Stores any amount of games with two players and current state.
 * State encoding:
 *    positive numbers for white, negative numbers for black
 *    for details, see
 *    https://github.com/ise-ethereum/on-chain-chess/wiki/Chess-board-representation
 */

import "TurnBasedGame.sol";
import "ChessLogic.sol";

contract Chess is TurnBasedGame {
    using ChessLogic for ChessLogic.State;
    mapping (bytes32 => ChessLogic.State) gameStates;



    event GameInitialized(bytes32 indexed gameId, address indexed player1, string player1Alias, address playerWhite, uint pot);
    event GameJoined(bytes32 indexed gameId, address indexed player1, string player1Alias, address indexed player2, string player2Alias, address playerWhite, uint pot);
    event GameStateChanged(bytes32 indexed gameId, int8[128] state);
    event GameTimeoutStarted(bytes32 indexed gameId,uint timeoutStarted, int8 timeoutState);
    event Move(bytes32 indexed gameId, address indexed player, uint256 fromIndex, uint256 toIndex);

    function Chess(bool enableDebugging) TurnBasedGame(enableDebugging) {
    }

    /**
     * Initialize a new game
     * string player1Alias: Alias of the player creating the game
     * bool playAsWhite: Pass true or false depending on if the creator will play as white
     */
    function initGame(string player1Alias, bool playAsWhite) public returns (bytes32) {
        bytes32 gameId = super.initGame(player1Alias, playAsWhite);

        // Setup game state
        int8 nextPlayerColor = playAsWhite ? int8(1) : int8(-1);
        gameStates[gameId].setupState(nextPlayerColor);

        if (playAsWhite) {
            // Player 1 will play as white
            gameStates[gameId].playerWhite = msg.sender;

            // Game starts with White, so here player 1
            games[gameId].nextPlayer = games[gameId].player1;
        }

        // Sent notification events
        GameInitialized(gameId, games[gameId].player1, player1Alias, gameStates[gameId].playerWhite, games[gameId].pot);
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

        GameJoined(gameId, games[gameId].player1, games[gameId].player1Alias, games[gameId].player2, player2Alias, gameStates[gameId].playerWhite, games[gameId].pot);
    }

    function move(bytes32 gameId, uint256 fromIndex, uint256 toIndex) notEnded(gameId) public {
        if (games[gameId].nextPlayer != msg.sender) {
            throw;
        }
        if(games[gameId].timeoutState != 0) {
            games[gameId].timeoutState = 0;
        }
        // Chess move validation
        gameStates[gameId].move(fromIndex, toIndex);

        // Set nextPlayer
        if (msg.sender == games[gameId].player1) {
            games[gameId].nextPlayer = games[gameId].player2;
        } else {
            games[gameId].nextPlayer = games[gameId].player1;
        }

        // Send events
        Move(gameId, msg.sender, fromIndex, toIndex);
        GameStateChanged(gameId, gameStates[gameId].fields);
    }

    /* Explicit set game state. Only in debug mode */
    function setGameState(bytes32 gameId, int8[128] state, address nextPlayer) debugOnly public {
        int8 playerColor = nextPlayer == gameStates[gameId].playerWhite ? int8(1) : int8(-1);
        gameStates[gameId].setState(state, playerColor);
        games[gameId].nextPlayer = nextPlayer;
        GameStateChanged(gameId, gameStates[gameId].fields);
    }

    function getCurrentGameState(bytes32 gameId) constant returns (int8[128]) {
       return gameStates[gameId].fields;
    }

    function getWhitePlayer(bytes32 gameId) constant returns (address) {
       return gameStates[gameId].playerWhite;
    }

    /* The sender claims he has won the game. Starts a timeout. */
    function claimWin(bytes32 gameId) notEnded(gameId) public {
        var game = games[gameId];
        // just the two players currently playing
        if (msg.sender != game.player1 && msg.sender != game.player2)
            throw;
        // only if timeout has not started
        if (game.timeoutState != 0)
            throw;
        // you can only claim draw / victory in the enemies turn
        if (msg.sender == game.nextPlayer)
            throw;
        game.timeoutStarted = now;
        game.timeoutState = 1;

        GameTimeoutStarted(gameId, game.timeoutStarted, game.timeoutState);
    }

    /* The sender offers the other player a draw. Starts a timeout. */
    function offerDraw(bytes32 gameId) notEnded(gameId) public {
        var game = games[gameId];
        // just the two players currently playing
        if (msg.sender != game.player1 && msg.sender != game.player2)
            throw;
        // only if timeout has not started
        if (game.timeoutState != 0)
            throw;
        // you can only claim draw / victory in the enemies turn
        if (msg.sender == game.nextPlayer)
            throw;
        game.timeoutStarted = now;
        game.timeoutState = -1;

        GameTimeoutStarted(gameId,game.timeoutStarted,game.timeoutState);
    }

    /* The sender claims a previously started timeout. */
    function claimTimeout(bytes32 gameId) notEnded(gameId) public {
        var game = games[gameId];
        // just the two players currently playing
        if (msg.sender != game.player1 && msg.sender != game.player2)
            throw;
        if (msg.sender == game.nextPlayer)
            throw;
        if (game.timeoutState == 0)
            throw;
        if (now < game.timeoutStarted + 10 minutes)
            throw;
        // Game is a draw, transfer ether back
        if (game.timeoutState == -1){
            game.ended = true;
            games[gameId].player1Winnings = games[gameId].pot / 2;
            games[gameId].player2Winnings = games[gameId].pot / 2;
            games[gameId].pot = 0;
            GameEnded(gameId);
        } else if (game.timeoutState == 1){
            game.ended = true;
            game.winner = msg.sender;
            if(msg.sender == game.player1) {
                games[gameId].player1Winnings = games[gameId].pot;
                games[gameId].pot = 0;
            }
            else {
                games[gameId].player2Winnings = games[gameId].pot;
                games[gameId].pot = 0;
            }

            GameEnded(gameId);
        } else {
            throw;
        }
    }

    /* A timeout can be confirmed by the non-initializing player. */
    function confirmGameEnded(bytes32 gameId) notEnded(gameId) public {
        var game = games[gameId];
        // just the two players currently playing
        if (msg.sender != game.player1 && msg.sender != game.player2)
            throw;
        if (msg.sender != game.nextPlayer)
            throw;
        if (game.timeoutState == 0)
            throw;
        // Game is a draw, transfer ether back
        if (game.timeoutState == -1){
            game.ended = true;
            games[gameId].player1Winnings = games[gameId].pot / 2;
            games[gameId].player2Winnings = games[gameId].pot / 2;
            games[gameId].pot = 0;
            GameEnded(gameId);
        } else if (game.timeoutState == 1){
            game.ended = true;
            // other player won
            if(msg.sender == game.player1) {
                game.winner = game.player2;
                games[gameId].player2Winnings = games[gameId].pot;
                games[gameId].pot = 0;
            }
            else {
                game.winner = game.player1;
                games[gameId].player1Winnings = games[gameId].pot;
                games[gameId].pot = 0;
            }
            GameEnded(gameId);
        } else {
            throw;
        }
    }

    /* This unnamed function is called whenever someone tries to send ether to the contract */
    function () {
        throw; // Prevents accidental sending of ether
    }
}
