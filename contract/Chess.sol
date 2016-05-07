/**
 * Chess contract
 * Stores any amount of games with two players and current state.
 * State encoding:
 *    positive numbers for white, negative numbers for black
 *    <TODO>
 */

contract Chess {
    int8[64] defaultState; // this should be constant if possible

    struct Game {
        address player1;
        address player2;
        address nextPlayer;
        address winner;
        int[64] state;
    }

    mapping (bytes32 => Game) games;

    function Chess() {
        // Just a test to see some output, this should be more storage/cost efficient
        defaultState[0] = 1;
        defaultState[1] = 1;
        defaultState[0x38] = -1;
        defaultState[0x39] = -1;
    }

    event GameInitialized(address indexed player1, address indexed player2, bytes32 indexed gameId);
    event GameStateChanged(bytes32 indexed gameId, int[64] state);
    event Move(bytes32 indexed gameId, bool indexed moveSuccesful);

    /* Initialize a game */
    function initGame(address withPlayer) public {
        // Generate game id based on two players' addresses and current timestamp
        bytes32 gameId = sha3(msg.sender, withPlayer, now);

        // Initialize participants
        games[gameId].player1 = msg.sender;
        games[gameId].player2 = withPlayer;

        // Initialize state
        games[gameId].state = defaultState;

        // Game starts with P2
        games[gameId].nextPlayer = withPlayer;

        // Sent notification events
        GameInitialized(games[gameId].player1, games[gameId].player2, gameId);
        GameStateChanged(gameId, games[gameId].state);
    }

    /* Move a figure */
    function move(bytes32 gameId) public {
        // Check that it is this player's turn
        if (games[gameId].nextPlayer != msg.sender) {
            throw;
        }

        // TODO: Validate move

        // TODO: Update state

        // TODO: Set nextPlayer

        // GameStateChanged(gameId, games[gameId].state);
        Move(gameId, true);
    }

    /* This unnamed function is called whenever someone tries to send ether to it */
    function () {
        throw;     // Prevents accidental sending of ether
    }
}
