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

    struct Game {
        address player1;
        address player2;
        string player1Alias;
        string player2Alias;
        address nextPlayer;
        address winner;
        bool ended;
        uint value; // What this game is worth ether paid into the game

        ChessLogic.State state;
    }

    mapping (bytes32 => Game) games;

    event GameInitialized(bytes32 indexed gameId, address indexed player1, string player1Alias, address playerWhite, uint value);
    event GameJoined(bytes32 indexed gameId, address indexed player1, string player1Alias, address indexed player2, string player2Alias, address playerWhite, uint value);
    event GameStateChanged(bytes32 indexed gameId, int8[128] state);
    event Move(bytes32 indexed gameId, address indexed player, uint256 fromIndex, uint256 toIndex);

    function Chess(bool enableDebugging) TurnBasedGame(enableDebugging) {
    }

    /**
     * Initialize a new game
     * string player1Alias: Alias of the player creating the game
     * bool playAsWhite: Pass true or false depending on if the creator will play as white
     */
    function initGame(string player1Alias, bool playAsWhite) public {
        // Generate game id based on player's addresses and current block number
        bytes32 gameId = sha3(msg.sender, block.number);

        games[gameId].ended = false;

        // Initialize participants
        games[gameId].player1 = msg.sender;
        games[gameId].player1Alias = player1Alias;

        // Initialize game value
        games[gameId].value = msg.value;

        // Add game to gamesOfPlayers
        gamesOfPlayers[msg.sender][gameId] = gamesOfPlayersHeads[msg.sender];
        gamesOfPlayersHeads[msg.sender] = gameId;

        // Add to openGameIds
        openGameIds[gameId] = head;
        head = gameId;

        // Setup game state

        games[gameId].state.setupState();

        if (playAsWhite) {
            // Player 1 will play as white
            games[gameId].state.playerWhite = msg.sender;

            // Game starts with White, so here player 1
            games[gameId].nextPlayer = games[gameId].player1;
        }


        // Sent notification events
        GameInitialized(gameId, games[gameId].player1, player1Alias, games[gameId].state.playerWhite, games[gameId].value);
        GameStateChanged(gameId, games[gameId].state.fields);
    }

    function isGameEnded(bytes32 gameId) public constant returns (bool) {
        return games[gameId].ended;
    }

    /**
     * Join an initialized game
     * bytes32 gameId: ID of the game to join
     * string player2Alias: Alias of the player that is joining
     */
    function joinGame(bytes32 gameId, string player2Alias) public {
        // Check that this game does not have a second player yet
        if (games[gameId].player2 != 0) {
            throw;
        }

        // throw if the second player did not match the bet.
        if (msg.value != games[gameId].value) {
            throw;
        }
        games[gameId].value += msg.value;

        games[gameId].player2 = msg.sender;
        games[gameId].player2Alias = player2Alias;

        super.joinGame(gameId, player2Alias);

        // If the other player isn't white, player2 will play as white
        if (games[gameId].state.playerWhite == 0) {
            games[gameId].state.playerWhite = msg.sender;
            // Game starts with White, so here player2
            games[gameId].nextPlayer = games[gameId].player2;
        }

        GameJoined(gameId, games[gameId].player1, games[gameId].player1Alias, games[gameId].player2, player2Alias, games[gameId].state.playerWhite, games[gameId].value);
    }

    /**
     * Surrender = unilateral declaration of loss
     */
    function surrender(bytes32 gameId) notEnded(gameId) public {
        if (games[gameId].winner != 0) {
            // Game already ended
            throw;
        }
        if (games[gameId].player1 == msg.sender) {
            // Player 1 surrendered, player 2 won
            games[gameId].winner = games[gameId].player2;
        } else if(games[gameId].player2 == msg.sender) {
            // Player 2 surrendered, player 1 won
            games[gameId].winner = games[gameId].player1;
        } else {
            // Sender is not a participant of this game
            throw;
        }

        games[gameId].ended = true;
        GameEnded(gameId, games[gameId].winner);
    }

    /**
     * Allows the winner of a game to withdraw their ether
     * bytes32 gameId: ID of the game they have won
     */
    function withdraw(bytes32 gameId) public {
        if (games[gameId].winner != msg.sender){
            throw;
        }

        // send money
        uint payout = games[gameId].value;
        games[gameId].value = 0;
        if (!msg.sender.send(payout)){
            throw;
        }
    }

    function move(bytes32 gameId, uint256 fromIndex, uint256 toIndex) notEnded(gameId) public {
        if (games[gameId].nextPlayer != msg.sender) {
            throw;
        }

        // Chess move validation
        games[gameId].state.move(fromIndex, toIndex);

        // Set nextPlayer
        if (msg.sender == games[gameId].player1) {
            games[gameId].nextPlayer = games[gameId].player2;
        } else {
            games[gameId].nextPlayer = games[gameId].player1;
        }

        // Send events
        Move(gameId, msg.sender, fromIndex, toIndex);
        GameStateChanged(gameId, games[gameId].state.fields);
    }

    /* Explicit set game state. Only in debug mode */
    function setGameState(bytes32 gameId, int8[128] state, address nextPlayer) debugOnly public {
        ChessLogic.setState(games[gameId].state, state);
        games[gameId].nextPlayer = nextPlayer;
        GameStateChanged(gameId, games[gameId].state.fields);
    }

    function getCurrentGameState(bytes32 gameId) constant returns (int8[128]) {
       return games[gameId].state.fields;
    }

    /* The sender claims that playerColor is in check mate */
    function claimCheckmate(bytes32 gameId, int8 checkedPlayerColor) notEnded(gameId) public {
        // TODO
    }

    function claimStalemate(bytes32 gameId, int8 stalledPlayerColor) notEnded(gameId) public {
        // TODO
    }

    // closes a game that is not currently running
    function closePlayerGame(bytes32 gameId) public {
        var game = games[gameId];

        // game already started and not finished yet
        if (!(game.player2 == 0 || game.ended))
            throw;
        if (msg.sender != game.player1 && msg.sender != game.player2)
            throw;
        if (!game.ended)
            games[gameId].ended = true;

        if (game.player2 == 0) {
            // Remove from openGameIds
            if (head == gameId) {
                head = openGameIds[head];
                openGameIds[gameId] = 0;
            } else {
                for (var g = head; g != 'end' && openGameIds[g] != 'end'; g = openGameIds[g]) {
                    if (openGameIds[g] == gameId) {
                        openGameIds[g] = openGameIds[gameId];
                        openGameIds[gameId] = 0;
                        break;
                    }
                }
            }
        }

        // Remove from gamesOfPlayers
        var playerHead = gamesOfPlayersHeads[msg.sender];
        if (playerHead == gameId) {
            gamesOfPlayersHeads[msg.sender] = gamesOfPlayers[msg.sender][playerHead];

            gamesOfPlayers[msg.sender][head] = 0;
        } else {
            for (var ga = playerHead; ga != 0 && gamesOfPlayers[msg.sender][ga] != 'end';
                    ga = gamesOfPlayers[msg.sender][ga]) {
                if (gamesOfPlayers[msg.sender][ga] == gameId) {
                    gamesOfPlayers[msg.sender][ga] = gamesOfPlayers[msg.sender][gameId];
                    gamesOfPlayers[msg.sender][gameId] = 0;
                    break;
                }
            }
        }

        GameClosed(gameId, msg.sender);
    }


    /* This unnamed function is called whenever someone tries to send ether to the contract */
    function () {
        throw; // Prevents accidental sending of ether
    }

    modifier notEnded(bytes32 gameId) {
        if (games[gameId].ended) throw;
        _
    }
}
