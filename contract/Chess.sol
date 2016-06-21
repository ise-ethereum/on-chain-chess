/**
 * Chess contract
 * Stores any amount of games with two players and current state.
 * State encoding:
 *    positive numbers for white, negative numbers for black
 *    for details, see
 *    https://github.com/ise-ethereum/on-chain-chess/wiki/Chess-board-representation
 */


 contract Chess {
    // default state array, all numbers offset by +8
    bytes constant defaultState = '\x04\x06\x05\x03\x02\x05\x06\x04\x08\x08\x08\x0c\x08\x08\x08\x08\x07\x07\x07\x07\x07\x07\x07\x07\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x09\x09\x09\x09\x09\x09\x09\x09\x08\x08\x08\x08\x08\x08\x08\x08\x0c\x0a\x0b\x0d\x0e\x0b\x0a\x0c\x08\x08\x08\x7c\x08\x08\x08\x08';

    bool debug; // If contract is deployed in debug mode, some debug features are enabled

    modifier debugOnly {
        if (!debug)
            throw;
        _
    }

    modifier notEnded(bytes32 gameId) {
        if (games[gameId].ended) throw;
        _
    }

    struct Game {
        address player1;
        address player2;
        string player1Alias;
        string player2Alias;
        address nextPlayer;
        address playerWhite; // Player that is white in this game
        address winner;
        bool ended;
        uint value; // What this game is worth ether paid into the game

        int8[128] state;
    }

    mapping (bytes32 => Game) public games;

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

    // stack of open game ids
    mapping (bytes32 => bytes32) public openGameIds;
    bytes32 public head;

    /* Flags needed for validation
     * Usage e.g. Flags(Flag.FLAG_NAME), Directions(Direction.UP), Players(Player.WHITE)
     * Because there are no constant arrays in Solidity, we use byte literals that
     * contain the needed numbers encoded as hex characters. We can only encode
     * positive numbers this way, so if negative flags are needed, all values are
     * stored shifted and later un-shifted in the accessors.
     */
    enum Player { WHITE, BLACK }
    enum Piece { BLACK_KING, BLACK_QUEEN, BLACK_ROOK, BLACK_BISHOP, BLACK_KNIGHT, BLACK_PAWN, EMPTY, WHITE_PAWN, WHITE_KNIGHT, WHITE_BISHOP, WHITE_ROOK, WHITE_QUEEN, WHITE_KING }
    enum Direction { UP, UP_RIGHT, RIGHT, DOWN_RIGHT, DOWN, DOWN_LEFT, LEFT, UP_LEFT }
    bytes constant c_Directions = "\x30\x31\x41\x51\x50\x4f\x3f\x2f"; // [-16, -15, 1, 17, 16, 15, -1, -17] shifted by +64
    enum Flag { MOVE_COUNT_H, MOVE_COUNT_L, WHITE_KING_POS, BLACK_KING_POS, CURRENT_PLAYER, WHITE_LEFT_CASTLING, WHITE_RIGHT_CASTLING, BLACK_LEFT_CASTLING, BLACK_RIGHT_CASTLING, BLACK_EN_PASSANT, WHITE_EN_PASSANT}
    bytes constant c_Flags = "\x08\x09\x7b\x0b\x38\x4e\x4f\x3e\x3f\x3d\x4d\x3c\x4c"; // [8, 123, 11, 56, 78, 79, 62, 63, 61, 77, 60, 76]
    function Flags(Flag i) constant internal returns (uint) {
       return uint(c_Flags[uint(i)]);
    }
    function Pieces(Piece i) constant internal returns (int8) {
        return -6 + int8(uint(i));
    }
    function Directions(Direction i) constant internal returns (int8) {
        return -64 + int8(c_Directions[uint(i)]);
    }
    function Players(Player p) constant internal returns (int8) {
        if (p == Player.WHITE) {
            return 1;
        }
        return -1;
    }

    bytes constant knightMoves = '\x1f\x21\x2e\x32\x4e\x52\x5f\x61'; // [-33, -31, -18, -14, 14, 18, 31, 33] shifted by +64

    function Chess(bool enableDebugging) {
        debug = enableDebugging;
        head = 'end';
    }

    event GameInitialized(bytes32 indexed gameId, address indexed player1, string player1Alias, address playerWhite, uint value);
    event GameJoined(bytes32 indexed gameId, address indexed player1, string player1Alias, address indexed player2, string player2Alias, address playerWhite, uint value);

    event GameStateChanged(bytes32 indexed gameId, int8[128] state);
    event Move(bytes32 indexed gameId, address indexed player, uint256 fromIndex, uint256 toIndex);
    event GameEnded(bytes32 indexed gameId, address indexed winner);
    event GameClosed(bytes32 indexed gameId, address indexed player);

    event DebugInts(string message, int value1, int value2, int value3);

    /**
     * Convenience function to set a flag
     * Usage: setFlag(gameId, Flag.BLACK_KING_POS, 4);
     */

    function setFlag(bytes32 gameId, Flag flag, int value) internal {
        games[gameId].state[Flags(flag)] = int8(value);
    }

    /**
     * Convenience function to set a flag
     * Usage: getFlag(gameId, Flag.BLACK_KING_POS);
     */
    function getFlag(bytes32 gameId, Flag flag) constant internal returns (int8) {
        return games[gameId].state[Flags(flag)];
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
        games[gameId].value = 0;
        games[gameId].value = msg.value;
        // Initialize state

        for (uint i = 0; i < 128; i++) {
            // Read defaultState bytes string, which is offset by 8 to be > 0
            games[gameId].state[i] = int8(defaultState[i]) - 8;
        }

        if (playAsWhite) {
            // Player 1 will play as white
            games[gameId].playerWhite = msg.sender;

            // Game starts with White, so here player 1
            games[gameId].nextPlayer = games[gameId].player1;
        }

        // Add game to gamesOfPlayers
        gamesOfPlayers[msg.sender][gameId] = gamesOfPlayersHeads[msg.sender];
        gamesOfPlayersHeads[msg.sender] = gameId;

        // Add to openGameIds
        openGameIds[gameId] = head;
        head = gameId;

        // Sent notification events
        GameInitialized(gameId, games[gameId].player1, player1Alias, games[gameId].playerWhite, games[gameId].value);
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

        // throw if the second player did not at least match the bet.
        if (games[gameId].value != msg.value) {
            throw;
        }
        else {
            games[gameId].value += msg.value;
        }

        games[gameId].player2 = msg.sender;
        games[gameId].player2Alias = player2Alias;

        // If the other player isn't white, player2 will play as white
        if (games[gameId].playerWhite == 0) {
            games[gameId].playerWhite = msg.sender;
            // Game starts with White, so here player2
            games[gameId].nextPlayer = games[gameId].player2;
        }

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

        GameJoined(gameId, games[gameId].player1, games[gameId].player1Alias, games[gameId].player2, player2Alias, games[gameId].playerWhite, games[gameId].value);
    }

    /* Explicity set game state. Only in debug mode */
    function setGameState(bytes32 gameId, int8[128] state, address nextPlayer) debugOnly public {
        games[gameId].state = state;
        games[gameId].nextPlayer = nextPlayer;
        GameStateChanged(gameId, games[gameId].state);
    }

    /**
    * Allows the winner of a game to claim their ether
    * bytes32 gameId: ID of the game they have won
    */
    function claimWin(bytes32 gameId) public {
          //if (ended) is the same as: if (sender.id = gameId.winnerid)
          if (games[gameId].winner == msg.sender){
              //send money
              uint payout = games[gameId].value;
              games[gameId].value = 0;
              if (!msg.sender.send(payout)){
                  games[gameId].value = payout;
                  throw;
              }
          }
          else {
              throw;
          }
    }

    /* validates a move and executes it */
    function move(bytes32 gameId, uint256 fromIndex, uint256 toIndex) notEnded(gameId) public {
        // Check that it is this player's turn
        if (games[gameId].nextPlayer != msg.sender) {
            throw;
        }

        int8 currentPlayerColor;
        if (msg.sender == games[gameId].playerWhite) {
            currentPlayerColor = Players(Player.WHITE);
        } else {
            currentPlayerColor = Players(Player.BLACK);
        }

        int8 fromFigure = games[gameId].state[fromIndex];
        int8 toFigure = games[gameId].state[toIndex];

        // Simple sanity checks
        sanityCheck(fromIndex, toIndex, fromFigure, toFigure, currentPlayerColor);

        // Check if move is technically possible
        if (!validateMove(gameId, fromIndex, toIndex, fromFigure, toFigure, currentPlayerColor)) {
            throw;
        }

        // For all pieces except knight, check if way is free
        if (abs(fromFigure) != uint(Pieces(Piece.WHITE_KNIGHT))) {
            // In case of king, it will check that he is not in check on any of the fields he moves over
            bool checkForCheck = abs(fromFigure) == uint(Pieces(Piece.WHITE_KING));
            checkWayFree(gameId, fromIndex, toIndex, currentPlayerColor, checkForCheck);
            if (debug) {
                DebugInts("way is free", int(fromIndex), int(toIndex), boolToInt(checkForCheck));
            }
            // Check field between rook and king in case of castling
            if (fromFigure == Pieces(Piece.BLACK_KING) && toIndex == 2 && games[gameId].state[1] != 0 ||
                fromFigure == Pieces(Piece.WHITE_KING) && toIndex == 114 && games[gameId].state[113] != 0) {
                throw;
            }
        }

        // Make the move
        makeMove(gameId, fromIndex, toIndex, fromFigure, toFigure);
        if (debug) {
            DebugInts("makeMove done", int(fromIndex), int(toIndex), int(fromFigure));
        }

        // Check legality (player's own king may not be in check after move)
        checkLegality(gameId, fromIndex, toIndex, fromFigure, toFigure, currentPlayerColor);
        if (debug) {
            DebugInts("checkLegality done", int(fromIndex), int(toIndex), int(fromFigure));
        }

        // Set nextPlayer
        if (msg.sender == games[gameId].player1) {
            games[gameId].nextPlayer = games[gameId].player2;
        } else {
            games[gameId].nextPlayer = games[gameId].player1;
        }

        // Update move count
        // High and Low are int8, so from -127 to 127
        // By using two flags we extend the positive range to 14 bit, 0 to 16384
        int16 moveCount = int16(getFlag(gameId, Flag.MOVE_COUNT_H)) * (2**7) | int16(getFlag(gameId, Flag.MOVE_COUNT_L));
        moveCount += 1;
        if (moveCount > 127) {
            setFlag(gameId, Flag.MOVE_COUNT_H, moveCount / (2**7));
        }
        setFlag(gameId, Flag.MOVE_COUNT_L, moveCount % 128);

        // Send events
        Move(gameId, msg.sender, fromIndex, toIndex);
        GameStateChanged(gameId, games[gameId].state);
    }

    function sanityCheck(uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure, int8 currentPlayerColor) internal {
        // check that move is within the field
        if (toIndex & 0x88 != 0 || fromIndex & 0x88 != 0) {
            throw;
        }

        // check that from and to are distinct
        if (fromIndex == toIndex) {
            throw;
        }

        // check if the toIndex is empty (= is 0) or contains an enemy figure ("positive" * "negative" = "negative")
        // --> this only allows captures (negative results)  or moves to empty fields ( = 0)
        if (fromFigure * toFigure > 0) {
            throw;
        }

        // check if mover of the figure is the owner of the figure
        // also check if there is a figure at fromIndex to move (fromFigure != 0)
        if (currentPlayerColor * fromFigure <= 0) {
            throw;
        }
    }

    /**
     * Validates if a move is technically (not legally) possible,
     * i.e. if piece is capable to move this way
     */
    function validateMove(bytes32 gameId, uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure, int8 movingPlayerColor) notEnded(gameId) returns (bool) {
        int8 direction = getDirection(fromIndex, toIndex);
        bool isDiagonal = !(abs(direction) == 16 || abs(direction) == 1);

        if (debug) {
            DebugInts('validateMove. fromFigure, toFigure, direction', int(fromFigure), int(fromFigure), int(direction));
        }

        // Kings
        if (abs(fromFigure) == uint(Pieces(Piece.WHITE_KING))) {
            // Normal move
            if (int(fromIndex) + direction == int(toIndex)) {
                return true;
            }
            // Cannot castle if already in check
            if (checkForCheck(gameId, fromIndex, movingPlayerColor)) {
                return false;
            }
            // Castling
            if (fromFigure == Pieces(Piece.BLACK_KING)) {
                if (4 == fromIndex && toFigure == 0) {
                    if (toIndex == 2 && getFlag(gameId, Flag.BLACK_LEFT_CASTLING) >= 0) {
                        return true;
                    }
                    if (toIndex == 6 && getFlag(gameId, Flag.BLACK_RIGHT_CASTLING) >= 0) {
                        return true;
                    }
                }
            }
            if (fromFigure == Pieces(Piece.WHITE_KING)) {
                if (116 == fromIndex && toFigure == 0) {
                    if (toIndex == 114 && getFlag(gameId, Flag.WHITE_LEFT_CASTLING) >= 0) {
                        return true;
                    }
                    if (toIndex == 118 && getFlag(gameId, Flag.WHITE_RIGHT_CASTLING) >= 0) {
                        return true;
                    }
                }
            }

            return false;
        }

        // Bishops, Queens, Rooks
        if (abs(fromFigure) == uint(Pieces(Piece.WHITE_BISHOP)) ||
            abs(fromFigure) == uint(Pieces(Piece.WHITE_QUEEN)) ||
            abs(fromFigure) == uint(Pieces(Piece.WHITE_ROOK))) {

            // Bishop can only walk diagonally, Rook only non-diagonally
            if (!isDiagonal && abs(fromFigure) == uint(Pieces(Piece.WHITE_BISHOP)) ||
                isDiagonal && abs(fromFigure) == uint(Pieces(Piece.WHITE_ROOK))) {
                return false;
            }

            // Traverse all fields in direction
            int temp = int(fromIndex);
            // walk in direction while inside board to find toIndex
            while (temp & 0x88 == 0) {
                if (uint(temp) == toIndex) {
                    return true;
                }
                temp += direction;
            }

            return false;
        }

        // Pawns
        if (abs(fromFigure) == uint(Pieces(Piece.WHITE_PAWN))) {
            // Black can only move in positive, White negative direction
            if (fromFigure == Pieces(Piece.BLACK_PAWN) && direction < 0 ||
                fromFigure == Pieces(Piece.WHITE_PAWN) && direction > 0) {
                return false;
            }
            // Forward move
            if (!isDiagonal) {
                // no horizontal movement allowed
                if (abs(direction) < 2) {
                    return false;
                }
                // simple move
                if (int(fromIndex) + direction == int(toIndex)) {
                    if(toFigure == Pieces(Piece.EMPTY)){
                        return true;
                    }

                }
                // double move
                if (int(fromIndex) + direction + direction == int(toIndex)) {
                    // Can only do double move starting form specific ranks
                    int rank = int(fromIndex/16);
                    if (1 == rank || 6 == rank) {
                        if(toFigure == Pieces(Piece.EMPTY)){
                            return true;
                        }
                    }
                }
                return false;
            }
            // diagonal move
            if (int(fromIndex) + direction == int(toIndex)) {
                // if empty, the en passant flag needs to be set
                if (toFigure * fromFigure == 0) {
                    if (fromFigure == Pieces(Piece.BLACK_PAWN) &&
                        getFlag(gameId, Flag.WHITE_EN_PASSANT) == int(toIndex) ||
                        fromFigure == Pieces(Piece.WHITE_PAWN) &&
                        getFlag(gameId, Flag.BLACK_EN_PASSANT) == int(toIndex)) {
                        return true;
                    }
                    return false;
                }
                // If not empty
                return true;
            }

            return false;
        }

        // Knights
        if (abs(fromFigure) == uint(Pieces(Piece.WHITE_KNIGHT))) {
            for (uint i; i < 8; i++) {
                if (int(fromIndex) + int(knightMoves[i]) - 64 == int(toIndex)) {
                    return true;
                }
            }
            return false;
        }

        return false;

    }


    /**
     * Checks if the way between fromIndex and toIndex is unblocked
     */
    function checkWayFree(bytes32 gameId, uint256 fromIndex, uint256 toIndex, int8 currentPlayerColor, bool shouldCheckForCheck) internal {
        int8 direction = getDirection(fromIndex, toIndex);
        int currentIndex = int(fromIndex) + direction;

        // as long as we do not reach the desired position walk in direction and check
        while (int(toIndex) != currentIndex) {
            //DebugInts("checking way index from", int(fromIndex), int(currentIndex), boolToInt(shouldCheckForCheck));
            // we reached the end of the field
            if (currentIndex & 0x88 != 0) {
                throw;
            }
            // the path is blocked
            if (games[gameId].state[uint(currentIndex)] != 0) {
                throw;
            }
            // Check for check in case of king
            if (shouldCheckForCheck && checkForCheck(gameId, uint(currentIndex), currentPlayerColor)) {
                //DebugInts("king is in check on", int(currentIndex), 0, 0);
                throw;
            }
            currentIndex = currentIndex + direction;
        }
        return;
    }

    function checkForCheck(bytes32 gameId, uint256 kingIndex, int8 currentPlayerColor) internal returns (bool) {

        if (debug) {
            DebugInts("checkForCheck", int(kingIndex), int(currentPlayerColor), 0);
        }
        //get Position of King
       // int8 kingIndex = getOwnKing(gameId, currentPlayerColor);

        // look in every direction whether there is an enemy figure that checks the king
        for (uint dir = 0; dir < 8; dir ++) {
          // get the first Figure in this direction. Threat of Knight does not change through move of fromFigure.
          // All other figures can not jump over figures. So only the first figure matters.
          int8 firstFigureIndex = getFirstFigure(gameId, Directions(Direction(dir)),int8(kingIndex));

          // if we found a figure in the danger direction
          if (firstFigureIndex != -1) {
              int8 firstFigure = games[gameId].state[uint(firstFigureIndex)];
              // if its an enemy
              if (firstFigure * currentPlayerColor < 0) {
                  if (debug) {
                    DebugInts("check: enempy in direction", int(Directions(Direction(dir))), int(firstFigure), int(firstFigureIndex));
                  }
                  // check if the enemy figure can move to the field of the king
                  int8 kingFigure = Pieces(Piece.WHITE_KING) * currentPlayerColor;
                  if (validateMove(gameId, uint256(firstFigureIndex), uint256(kingIndex), firstFigure, kingFigure, currentPlayerColor)) {
                      // it can
                      return true; // king is checked
                  }
              }
          }
        }

        //Knights
        // Knights can jump over figures. So they need to be tested seperately with every possible move.
        for(uint move = 0; move < 8; move ++){
            // currentMoveIndex: where knight could start with move that checks king
            int8 currentMoveIndex = int8(kingIndex) + int8(knightMoves[move]);

            // if inside the board
            if(uint(currentMoveIndex) & 0x88 == 0){

                // get Figure at currentMoveIndex
                int8 currentFigure = Pieces(Piece(currentMoveIndex));

                // if it is an enemy knight, king can be checked
                if (currentFigure * currentPlayerColor == Pieces(Piece.WHITE_KNIGHT)) {
                    return true; // king is checked
                }
            }
        }

        return false; // king is not checked
    }

    function getDirection(uint256 fromIndex, uint256 toIndex) constant internal returns (int8) {
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
        if (isAboveLeft) {
            if (isSameVertical) {
                return Directions(Direction.UP);
            }
            if (isSameHorizontal) {
                return Directions(Direction.LEFT);
            }
            if (isLeftSide) {
                return Directions(Direction.UP_LEFT);
            } else {
                return Directions(Direction.UP_RIGHT);
            }
        } else {
            if (isSameVertical) {
                return Directions(Direction.DOWN);
            }
            if (isSameHorizontal) {
                return Directions(Direction.RIGHT);
            }
            if (isLeftSide) {
                return Directions(Direction.DOWN_LEFT);
            } else {
                return Directions(Direction.DOWN_RIGHT);
            }
        }
    }


    function makeMove(bytes32 gameId, uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure) internal {
        // remove all en passant flags
        setFlag(gameId, Flag.WHITE_EN_PASSANT, 0);
        setFlag(gameId, Flag.BLACK_EN_PASSANT, 0);

        // <---- Special Move ---->

        // Black King
        if (fromFigure == Pieces(Piece.BLACK_KING)) {
            // Update position flag
            setFlag(gameId, Flag.BLACK_KING_POS, int8(toIndex));
            // Castling
            if (fromIndex == 4 && toIndex == 2) {
                games[gameId].state[0] = 0;
                games[gameId].state[3] = Pieces(Piece.BLACK_ROOK);
            }
            if (fromIndex == 4 && toIndex == 6) {
                games[gameId].state[7] = 0;
                games[gameId].state[5] = Pieces(Piece.BLACK_ROOK);
            }

        }
        // White King
        if (fromFigure == Pieces(Piece.WHITE_KING)) {
            // Update position flag
            setFlag(gameId, Flag.WHITE_KING_POS, int8(toIndex));
            // Castling
            if (fromIndex == 116 && toIndex == 114) {
                games[gameId].state[112] = 0;
                games[gameId].state[115] = Pieces(Piece.WHITE_ROOK);
            }
            if (fromIndex == 116 && toIndex == 118) {
                games[gameId].state[119] = 0;
                games[gameId].state[117] = Pieces(Piece.WHITE_ROOK);
            }

        }

        // Remove Castling Flag if king or Rook moves. But only at the first move for better performance

        // Black
        if (fromFigure == Pieces(Piece.BLACK_KING)) {
            if (fromIndex == 4) {
                setFlag(gameId, Flag.BLACK_LEFT_CASTLING, -1);
                setFlag(gameId, Flag.BLACK_RIGHT_CASTLING, -1);
            }
        }
        if (fromFigure == Pieces(Piece.BLACK_ROOK)) {
            if (fromIndex == 0) {
                setFlag(gameId, Flag.BLACK_LEFT_CASTLING, -1);
            }
            if (fromIndex == 7) {
                setFlag(gameId, Flag.BLACK_RIGHT_CASTLING, -1);
            }
        }

        // White
        if (fromFigure == Pieces(Piece.WHITE_KING)) {
            if (fromIndex == 116) {
                setFlag(gameId, Flag.WHITE_LEFT_CASTLING, -1);
                setFlag(gameId, Flag.WHITE_RIGHT_CASTLING, -1);
            }
        }
        if (fromFigure == Pieces(Piece.WHITE_ROOK)) {
            if (fromIndex == 112) {
                setFlag(gameId, Flag.WHITE_LEFT_CASTLING, -1);
            }
            if (fromIndex == 119) {
                setFlag(gameId, Flag.WHITE_RIGHT_CASTLING, -1);
            }
        }

        int8 direction = getDirection(fromIndex, toIndex);

        // PAWN - EN PASSANT or DOUBLE STEP
        if (abs(fromFigure) == uint(Pieces(Piece.WHITE_PAWN))) {
            // En Passant - remove caught pawn
            // en passant if figure: pawn and diagonal move to empty field
            if (is_diagonal(direction) && toFigure == Pieces(Piece.EMPTY)) {
                if (fromFigure == Pieces(Piece.BLACK_PAWN)) {
                    games[gameId].state[uint(int(toIndex) + Directions(Direction.UP))] = 0;
                } else {
                    games[gameId].state[uint(int(toIndex) + Directions(Direction.DOWN))] = 0;
                }
            }

            // in case of double Step: set EN_PASSANT-Flag
            else if (int(fromIndex) + direction + direction == int(toIndex)) {
                if (fromFigure == Pieces(Piece.BLACK_PAWN)) {
                    setFlag(gameId, Flag.BLACK_EN_PASSANT, int8(toIndex) + Directions(Direction.UP));
                } else {
                    setFlag(gameId, Flag.WHITE_EN_PASSANT, int8(toIndex) + Directions(Direction.DOWN));
                }
            }
        }

        // <---- Promotion --->

        int targetRank = int(toIndex/16);
        if (targetRank == 7 && fromFigure == Pieces(Piece.BLACK_PAWN)) {
            games[gameId].state[toIndex] = Pieces(Piece.BLACK_QUEEN);
        }
        else if (targetRank == 0 && fromFigure == Pieces(Piece.WHITE_PAWN)) {
            games[gameId].state[toIndex] = Pieces(Piece.WHITE_QUEEN);
        }
        else {
            // Normal move
            games[gameId].state[toIndex] = games[gameId].state[fromIndex];
        }

        games[gameId].state[fromIndex] = 0;
    }

    // checks whether movingPlayerColor's king gets checked by move
    function checkLegality(bytes32 gameId, uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure, int8 movingPlayerColor) internal returns (bool){
        // Piece that was moved was the king
        if (abs(fromFigure) == uint(Pieces(Piece.WHITE_KING))) {
            if (checkForCheck(gameId, uint(toIndex), movingPlayerColor)) {
                //DebugInts("king is in check on", int(toIndex), 0, 0);
                throw;
            }
            // Else we can skip the rest of the checks
            return;
        }

        int8 kingIndex = getOwnKing(gameId, movingPlayerColor);

        // Moved other piece, but own king is still in check
        if (checkForCheck(gameId, uint(kingIndex), movingPlayerColor)) {
            //DebugInts("| king is still in check at @, cannot move ", int(kingIndex), int(fromIndex), int(toIndex));
            throw;
        }

        // through move of fromFigure away from fromIndex,
        // king may now be in danger from that direction
        int8 kingDangerDirection = getDirection(uint256(kingIndex), fromIndex);
        // get the first Figure in this direction. Threat of Knight does not change through move of fromFigure.
        // All other figures can not jump over other figures. So only the first figure matters.
        int8 firstFigureIndex = getFirstFigure(gameId, kingDangerDirection,kingIndex);

        // if we found a figure in the danger direction
        if (firstFigureIndex != -1) {
            int8 firstFigure = games[gameId].state[uint(firstFigureIndex)];

            // if its an enemy
            if (firstFigure * movingPlayerColor < 0) {
                // check if the figure can move to the field of the king
                int8 kingFigure = Pieces(Piece.BLACK_KING) * movingPlayerColor;
                if (validateMove(gameId, uint256(firstFigureIndex), uint256(kingIndex), firstFigure, kingFigure, movingPlayerColor)) {
                    // it can
                    throw;
                }
            }
        }

        return;
    }

    function testIfCheck() {

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

    // gets the first figure in direction from start, not including start
    function getFirstFigure(bytes32 gameId, int8 direction, int8 start) returns (int8){
        int currentIndex = start + direction;

        // as long as we do not reach the end of the board walk in direction
        while(currentIndex & 0x88 == 0){

            // if there is a figure at current field return it
            if(games[gameId].state[uint(currentIndex)] != Pieces(Piece.EMPTY))
                return int8(currentIndex);

            //otherwise move to the next field in that direction
            currentIndex = currentIndex + direction;
        }

        return -1;
    }

    /*------------------------HELPER FUNCTIONS------------------------*/

    // This returns the absolute value of an integer
    function abs(int256 value) returns (uint256){
        if (value>=0) return uint256(value);
        else return uint256(-1*value);
    }

    function is_diagonal(int8 direction) internal returns (bool){
      return !(abs(direction) == 16 || abs(direction) == 1);
    }

    function getOwnKing(bytes32 gameId, int8 movingPlayerColor) returns (int8){
        if (movingPlayerColor == Players(Player.WHITE))
            return getFlag(gameId, Flag.WHITE_KING_POS);
        else
            return getFlag(gameId, Flag.BLACK_KING_POS);
    }

    function boolToInt(bool value) returns (int) {
        if (value) {
            return 1;
        } else {
            return 0;
        }
    }

    /* This unnamed function is called whenever someone tries to send ether to it */
    function () {
        throw;     // Prevents accidental sending of ether
    }
}
