contract TurnBasedGame {
    bool debug; // If contract is deployed in debug mode, some debug features are enabled
    modifier debugOnly {
        if (!debug)
            throw;
        _
    }

    event GameEnded(bytes32 indexed gameId);
    event GameClosed(bytes32 indexed gameId, address indexed player);
    event GameTimeoutStarted(bytes32 indexed gameId, uint timeoutStarted, int8 timeoutState);
    event DebugInts(string message, int value1, int value2, int value3);

    struct Game {
        address player1;
        address player2;
        string player1Alias;
        string player2Alias;
        address nextPlayer;
        address winner;
        bool ended;
        uint pot; // What this game is worth: ether paid into the game
        uint player1Winnings;
        uint player2Winnings;
        uint timeoutStarted; // timer for timeout
        int8 timeoutState; // -1 draw 0 nothing 1 checkmate
    }

    mapping (bytes32 => Game) public games;

    // stack of open game ids
    mapping (bytes32 => bytes32) public openGameIds;
    bytes32 public head;

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
            games[gameId].player1Winnings = games[gameId].pot;
            games[gameId].pot = 0;
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
            games[gameId].player2Winnings = games[gameId].pot;
            games[gameId].pot = 0;
        } else if(games[gameId].player2 == msg.sender) {
            // Player 2 surrendered, player 1 won
            games[gameId].winner = games[gameId].player1;
            games[gameId].player1Winnings = games[gameId].pot;
            games[gameId].pot = 0;
        } else {
            // Sender is not a participant of this game
            throw;
        }

        games[gameId].ended = true;
        GameEnded(gameId);
    }

    /**
     * Allows the winner of a game to withdraw their ether
     * bytes32 gameId: ID of the game they have won
     */
    function withdraw(bytes32 gameId) public {
        uint payout = 0;
        if(games[gameId].player1 == msg.sender && games[gameId].player1Winnings > 0) {
            payout = games[gameId].player1Winnings;
            games[gameId].player1Winnings = 0;
            if (!msg.sender.send(payout)) {
                throw;
            }
        }
        else if(games[gameId].player2 == msg.sender && games[gameId].player2Winnings > 0) {
            payout = games[gameId].player2Winnings;
            games[gameId].player2Winnings = 0;
            if (!msg.sender.send(payout)) {
                throw;
            }
        }
        else {
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
        games[gameId].timeoutState = 0;

        // Initialize participants
        games[gameId].player1 = msg.sender;
        games[gameId].player1Alias = player1Alias;
        games[gameId].player1Winnings = 0;
        games[gameId].player2Winnings = 0;

        // Initialize game value
        games[gameId].pot = msg.value;

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
        if (msg.value != games[gameId].pot) {
            throw;
        }
        games[gameId].pot += msg.value;

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
        GameTimeoutStarted(gameId, game.timeoutStarted, game.timeoutState);
    }

    /* the sender claims that the other player is not in the game anymore. Starts a Timeout that can be claimed*/
    function claimTimeout(bytes32 gameId) notEnded(gameId) public {
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

    /* The sender claims a previously started timeout. */
    function claimTimeoutEnded(bytes32 gameId) notEnded(gameId) public {
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

    function TurnBasedGame(bool enableDebugging) {
        debug = enableDebugging;
        head = 'end';
    }
}
