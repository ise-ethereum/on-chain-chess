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

    struct Game {
        address player1;
        address player2;
        string player1Alias;
        string player2Alias;
        address nextPlayer;
        address winner;
        bool ended;
        uint value; // What this game is worth ether paid into the game
    }

    mapping (bytes32 => Game) public games;

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

    function isGameEnded(bytes32 gameId) public constant returns (bool) {
        return games[gameId].ended;
    }

    modifier notEnded(bytes32 gameId) {
        if (games[gameId].ended) throw;
        _
    }

    function initGame(string player1Alias, bool playAsWhite) public returns (bytes32) {
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

        return gameId;
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
