/**
 * Chess contract
 * Stores any amount of games with two players and current state.
 * State encoding:
 *    positive numbers for white, negative numbers for black
 *    for details, see
 *    https://github.com/ise-ethereum/on-chain-chess/wiki/Chess-board-representation
 */

contract Chess {
    int8[128] defaultState = [int8(-4),int8(-2),int8(-3),int8(-5),int8(-6),int8(-3),int8(-2),int8(-4),int8(0),int8(0),int8(0),int8(4),int8(0),int8(0),int8(0),int8(0),int8(-1),int8(-1),int8(-1),int8(-1),int8(-1),int8(-1),int8(-1),int8(-1),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(1),int8(1),int8(1),int8(1),int8(1),int8(1),int8(1),int8(1),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(0),int8(4),int8(2),int8(3),int8(5),int8(6),int8(3),int8(2),int8(4),int8(0),int8(0),int8(0),int8(116),int8(0),int8(0),int8(0),int8(0)];

    struct Game {
        address player1;
        address player2;
        string player1Alias;
        string player2Alias;
        address nextPlayer;
        address playerWhite; // Player that is white in this game
        address winner;
        int8[128] state;
    }

    mapping (bytes32 => Game) public games;
    mapping (address => mapping (int => bytes32)) public gamesOfPlayers;
    mapping (address => int) public numberGamesOfPlayers;

    // stack of open game ids
    mapping (bytes32 => bytes32) public openGameIds;
    bytes32 public head;

    /* Flags needed for validation
     * Usage e.g. Flags[uint(Flag.FLAG_NAME)]
     * Directions[Direction.UP]
     */
    enum Direction { UP, UP_RIGHT, RIGHT, DOWN_RIGHT, DOWN, DOWN_LEFT, LEFT, UP_LEFT }
    int8[8] Directions = [int8(-16), int8(-15), int8(1), int8(17), int8(16), int8(15), int8(-1), int8(-17)];
    enum Piece { WHITE_KING, WHITE_QUEEN, WHITE_ROOK, WHITE_BISHOP, WHITE_KNIGHT, WHITE_PAWN, EMPTY, BLACK_KING, BLACK_QUEEN, BLACK_ROOK, BLACK_BISHOP, BLACK_KNIGHT, BLACK_PAWN }
    int8[13] Pieces = [int8(-6), int8(-5), int8(-4), int8(-3), int8(-2), int8(-1), int8(0), int8(6), int8(5), int8(4), int8(3), int8(2), int8(1)];
    enum Player { WHITE, BLACK }
    int8[2] Players = [int8(1), int8(-1)];
    enum Flag { WHITE_KING_POS, BLACK_KING_POS, CURRENT_PLAYER, WHITE_LEFT_CASTLING, WHITE_RIGHT_CASTLING, BLACK_LEFT_CASTLING, BLACK_RIGHT_CASTLING, BLACK_EN_PASSANT, WHITE_EN_PASSANT}
    int8[9] Flags = [int8(123), int8(11), int8(16), int8(78), int8(79), int8(62), int8(63), int8(61), int8(77)];

    function Chess() {
        head = 'end';
    }

    event GameInitialized(bytes32 indexed gameId, address indexed player1, string player1Alias, address playerWhite);
    event GameJoined(bytes32 indexed gameId, address indexed player1, string player1Alias, address indexed player2, string player2Alias, address playerWhite);
    event GameStateChanged(bytes32 indexed gameId, int8[128] state);
    event Move(bytes32 indexed gameId, address indexed player, uint256 fromIndex, uint256 toIndex);
    event GameEnded(bytes32 indexed gameId, address indexed winner);

    /**
     * Convenience function to set a flag
     * Usage: setFlag(gameId, Flag.BLACK_KING_POS, 4);
     */
    function setFlag(bytes32 gameId, Flag flag, uint value) internal {
        games[gameId].state[uint(Flags[uint(flag)])] = int8(value);
    }

    /**
     * Initialize a new game
     * string player1Alias: Alias of the player creating the game
     * bool playAsWhite: Pass true or false depending on if the creator will play as white
     */
    function initGame(string player1Alias, bool playAsWhite) public {
        // Generate game id based on player's addresses and current block number
        bytes32 gameId = sha3(msg.sender, block.number);

        // Initialize participants
        games[gameId].player1 = msg.sender;
        games[gameId].player1Alias = player1Alias;

        // Initialize state
        games[gameId].state = defaultState;

        if (playAsWhite) {
            // Player 1 will play as white
            games[gameId].playerWhite = msg.sender;

            // Game starts with White, so here player 1
            games[gameId].nextPlayer = games[gameId].player1;
        }

        // Add game to gamesOfPlayers
        gamesOfPlayers[msg.sender][numberGamesOfPlayers[msg.sender]] = gameId;
        numberGamesOfPlayers[msg.sender]++;

        // Add to openGameIds
        openGameIds[gameId] = head;
        head = gameId;

        // Sent notification events
        GameInitialized(gameId, games[gameId].player1, player1Alias, games[gameId].playerWhite);
        GameStateChanged(gameId, games[gameId].state);
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

      games[gameId].player2 = msg.sender;
      games[gameId].player2Alias = player2Alias;

      // If the other player isn't white, player2 will play as white
      if (games[gameId].playerWhite == 0) {
        games[gameId].playerWhite = msg.sender;
        // Game starts with White, so here P2
        games[gameId].nextPlayer = games[gameId].player2;
      }

      // Add game to gamesOfPlayers
      gamesOfPlayers[msg.sender][numberGamesOfPlayers[msg.sender]] = gameId;
      numberGamesOfPlayers[msg.sender]++;

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

      GameJoined(gameId, games[gameId].player1, games[gameId].player1Alias, games[gameId].player2, player2Alias, games[gameId].playerWhite);
    }

    /* validates a move and executes it */
    function move(bytes32 gameId, uint256 fromIndex, uint256 toIndex) public {
        // Check that it is this player's turn
        if (games[gameId].nextPlayer != msg.sender) {
            throw;
        }


        int8 currentPlayerColor;
        if (msg.sender == games[gameId].playerWhite) {
            currentPlayerColor = Players[uint(Player.WHITE)];
        } else {
            currentPlayerColor = Players[uint(Player.BLACK)];
        }

        // TODO: Validate move

        int8 fromFigure = games[gameId].state[fromIndex];
        int8 toFigure = games[gameId].state[toIndex];

        //sanity check
        sanityCheck(fromIndex, toIndex, fromFigure, toFigure, currentPlayerColor);
        //isValid

        //makeTemporaryMove

        //isLegal

        //testIfCheck





        // Update state
        games[gameId].state[toIndex] = games[gameId].state[fromIndex];
        games[gameId].state[fromIndex] = 0;

        // Set nextPlayer
        if (msg.sender == games[gameId].player1) {
            games[gameId].nextPlayer = games[gameId].player2;
        } else {
            games[gameId].nextPlayer = games[gameId].player1;
        }

        Move(gameId, msg.sender, fromIndex, toIndex);
    }



        function sanityCheck(uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure, int8 currentPlayerColor){


            // check if the move actually fits the data structure
            if ((toIndex & 0x88) != 0){
                throw;
            }

            // check if the move tries to move a figure onto it self
            if (fromIndex == toIndex){
                throw;
            }

            // check if the toIndex is empty (= is 0) or contains an enemy figure ("positive" * "negative" = "negative")
            // --> this only allows captures ( negative results ) or moves to empty fields ( = 0)
            if (fromFigure * toFigure > 0){
                throw;
            }

            // check if mover of the figure is the owner of the figure
            //todo: fix color to enum
            if (currentPlayerColor * fromFigure > 0){
                throw;
            }
        }

        function isValid(uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure, int8 movingPlayerColor) returns (bool){



        }


        function getDirection(uint256 fromIndex, uint256 toIndex) returns (int8){

            // check if the figure is moved up or left of its origin
            bool isAboveLeft = fromIndex > toIndex;

            // check if the figure is moved in an horizontal plane
            // this code works because there is an eight square difference between the horizontal panes (the offboard)
            bool isSameHorizontal = (abs(int256(fromIndex) - int256(toIndex)) < (8));

            // check if the figure is moved in a vertical line
            bool isSameVertical = (fromIndex%8 == toIndex%8);

            // check if the figure is moved to the left of its origin
            bool isLeftSide = (fromIndex%8 > toIndex%8);

            /*Check directions*/

            if (isAboveLeft){
                return Directions[uint(Direction.UP)];

            }



        }


        function makeTemporaryMove(){

        }

        function isLegal(){

        }

        function testIfCheck(){

        }

    function surrender(bytes32 gameId) public {
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

        GameEnded(gameId, games[gameId].winner);
    }


    function getGameId(address player, int index) constant returns (bytes32) {
      return gamesOfPlayers[player][index];
    }


    /*------------------------HELPER FUNCTIONS------------------------*/

    // This returns the absolute value of an integer
    function abs(int256 value) returns (uint256){
        if (value>=0)return uint256(value);
        else return uint256(-1*value);
    }

    /* This unnamed function is called whenever someone tries to send ether to it */
    function () {
        throw;     // Prevents accidental sending of ether
    }
}
