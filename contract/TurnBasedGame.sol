contract TurnBasedGame {
    bool debug; // If contract is deployed in debug mode, some debug features are enabled
    modifier debugOnly {
        if (!debug)
            throw;
        _
    }

    event GameEnded(bytes32 indexed gameId, address indexed winner);
    event GameClosed(bytes32 indexed gameId, address indexed player);
    event DebugInts(string message, int value1, int value2, int value3);

    // stack of games of players
    mapping (address => mapping (bytes32 => bytes32)) public gamesOfPlayers;
    mapping (address => bytes32) public gamesOfPlayersHeads;

    function getGamesOfPlayer(address player) constant returns (bytes32[]) {
        var playerHead = gamesOfPlayersHeads[player];
        var counter = 0;
        for (var ga = playerHead; ga != 0; ga = gamesOfPlayers[player][ga]) {
            counter++;
        }
        bytes32[] memory data = new bytes32[](counter);
        var currentGame = playerHead;
        for (var i = 0; i < counter; i++) {
            data[i] = currentGame;
            currentGame = gamesOfPlayers[player][currentGame];
        }
        return data;
    }

    function getOpenGameIds() constant returns (bytes32[]) {
        var counter = 0;
        for (var ga = head; ga != 'end'; ga = openGameIds[ga]) {
            counter++;
        }
        bytes32[] memory data = new bytes32[](counter);
        var currentGame = head;
        for (var i = 0; i < counter; i++) {
            data[i] = currentGame;
            currentGame = openGameIds[currentGame];
        }
        return data;
    }

    // stack of open game ids
    mapping (bytes32 => bytes32) public openGameIds;
    bytes32 public head;

    /**
     * Join an initialized game
     * bytes32 gameId: ID of the game to join
     * string player2Alias: Alias of the player that is joining
     */
    function joinGame(bytes32 gameId, string player2Alias) public {
        // Add game to gamesOfPlayers
        gamesOfPlayers[msg.sender][gameId] = gamesOfPlayersHeads[msg.sender];
        gamesOfPlayersHeads[msg.sender] = gameId;

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

    function TurnBasedGame(bool enableDebugging) {
        debug = enableDebugging;
        head = 'end';
    }
}
