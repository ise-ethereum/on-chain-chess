/**
 * Chess contract
 * Stores any amount of games with two players and current state.
 * State encoding:
 *    positive numbers for white, negative numbers for black
 *    for details, see
 *    https://github.com/ise-ethereum/on-chain-chess/wiki/Chess-board-representation
 */

 contract Chess {
    bytes constant defaultState = '\x04\x06\x05\x03\x02\x05\x06\x04\x08\x08\x08\x0c\x08\x08\x08\x08\x07\x07\x07\x07\x07\x07\x07\x07\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x09\x09\x09\x09\x09\x09\x09\x09\x08\x08\x08\x08\x08\x08\x08\x08\x0c\x0a\x0b\x0d\x0e\x0b\x0a\x0c\x08\x08\x08\x7c\x08\x08\x08\x08';

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
     * Usage e.g. Flags(Flag.FLAG_NAME)
     * Directions(Direction.UP)
     */
    enum Player { WHITE, BLACK }
    enum Direction { UP, UP_RIGHT, RIGHT, DOWN_RIGHT, DOWN, DOWN_LEFT, LEFT, UP_LEFT }
    bytes constant c_Directions = "\x30\x31\x41\x51\x50\x4f\x3f\x2f";
    enum Piece { BLACK_KING, BLACK_QUEEN, BLACK_ROOK, BLACK_BISHOP, BLACK_KNIGHT, BLACK_PAWN, EMPTY, WHITE_PAWN, WHITE_KNIGHT, WHITE_BISHOP, WHITE_ROOK, WHITE_QUEEN, WHITE_KING }
    enum Flag { WHITE_KING_POS, BLACK_KING_POS, CURRENT_PLAYER, WHITE_LEFT_CASTLING, WHITE_RIGHT_CASTLING, BLACK_LEFT_CASTLING, BLACK_RIGHT_CASTLING, BLACK_EN_PASSANT, WHITE_EN_PASSANT}
    bytes constant c_Flags = "\x7b\x0b\x38\x4e\x4f\x3e\x3f\x3d\x4d\x3c\x4c";
    function Flags(Flag i) internal returns (uint) {
       return uint(c_Flags[uint(i)]);
    }
    function Pieces(Piece i) internal returns (int8) {
        return -6 + int8(uint(i));
    }
    function Directions(Direction i) internal returns (int8) {
        return -64 + int8(c_Directions[uint(i)]);
    }
    function Players(Player p) internal returns (int8) {
        if (p == Player.WHITE) {
            return 1;
        }
        return -1;
    }

    bytes constant knightMoves = '\x1f\x21\x2e\x32\x4e\x52\x5f\x61';

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
    function setFlag(bytes32 gameId, Flag flag, int value) internal {
        games[gameId].state[Flags(flag)] = int8(value);
    }

    /**
     * Convenience function to set a flag
     * Usage: getFlag(gameId, Flag.BLACK_KING_POS);
     */
    function getFlag(bytes32 gameId, Flag flag) internal returns (int8) {
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

        // Initialize participants
        games[gameId].player1 = msg.sender;
        games[gameId].player1Alias = player1Alias;

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
            // Game starts with White, so here player2
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
            currentPlayerColor = Players(Player.WHITE);
        } else {
            currentPlayerColor = Players(Player.BLACK);
        }

        int8 fromFigure = games[gameId].state[fromIndex];
        int8 toFigure = games[gameId].state[toIndex];

        // Simple sanity checks
        sanityCheck(fromIndex, toIndex, fromFigure, toFigure, currentPlayerColor);

        // Check if move is technically possible
        validateMove(gameId, fromIndex, toIndex, fromFigure, toFigure, currentPlayerColor);

        // For all pieces except knight, check if way is free
        // In case of king, it will check that he is not in check on any of the fields
        if (abs(fromFigure) != uint(Pieces(Piece.BLACK_KNIGHT))) {
            bool checkForCheck = abs(fromFigure) == uint(Pieces(Piece.BLACK_KING));
            checkWayFree(gameId, fromIndex, toIndex, currentPlayerColor, checkForCheck);
        }

        //makeTemporaryMove
        makeTemporaryMove(gameId, fromIndex, toIndex, fromFigure, toFigure);

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
        GameStateChanged(gameId, games[gameId].state);
    }

    function sanityCheck(uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure, int8 currentPlayerColor) {
        // check if the move actually fits the data structure
        if (((toIndex & 0x88) != 0) && ((fromIndex & 0x88) != 0)) {
            throw;
        }

        // check if the move tries to move a figure onto it self
        if (fromIndex == toIndex) {
            throw;
        }

        // check if the toIndex is empty (= is 0) or contains an enemy figure ("positive" * "negative" = "negative")
        // --> this only allows captures (negative results)  or moves to empty fields ( = 0)
        // also check if there is a figure at fromIndex to move (fromFigure != 0)
        if (fromFigure * toFigure > 0) {
            throw;
        }

        // check if mover of the figure is the owner of the figure
        // todo: fix color to enum
        if (currentPlayerColor * fromFigure > 0) {
            throw;
        }
    }

    /**
     * Validates if a move is technically (not legally) possible,
     * i.e. if piece is capable to move this way
     */
    function validateMove(bytes32 gameId, uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure, int8 movingPlayerColor) {
        int8 direction = getDirection(fromIndex, toIndex);
        bool isDiagonal = !(abs(direction) == 16 || abs(direction) == 1);

        // Kings
        if (abs(fromFigure) == uint(Pieces(Piece.BLACK_KING))) {
            // Normal move
            if (int(fromIndex) + direction == int(toIndex)) {
                return;
            }
            // Castling
            if (checkForCheck(gameId, fromIndex, movingPlayerColor)) {
                // Cannot move if already in check
                throw;
            }
            if (fromFigure == Pieces(Piece.BLACK_KING)) {
                if (4 == fromIndex && toFigure == 0) {
                    if (toIndex == 2 && getFlag(gameId, Flag.BLACK_LEFT_CASTLING) >= 0) {
                        return;
                    }
                    if (toIndex == 6 && getFlag(gameId, Flag.BLACK_RIGHT_CASTLING) >= 0) {
                        return;
                    }
                }
            }
            if (fromFigure == Pieces(Piece.WHITE_KING)) {
                if (116 == fromIndex && toFigure == 0) {
                    if (toIndex == 114 && getFlag(gameId, Flag.WHITE_LEFT_CASTLING) >= 0) {
                        return;
                    }
                    if (toIndex == 118 && getFlag(gameId, Flag.WHITE_RIGHT_CASTLING) >= 0) {
                        return;
                    }
                }
            }

            throw;
        }

        // Bishops, Queens, Rooks
        if (abs(fromFigure) == uint(Pieces(Piece.BLACK_BISHOP)) ||
            abs(fromFigure) == uint(Pieces(Piece.BLACK_QUEEN)) ||
            abs(fromFigure) == uint(Pieces(Piece.BLACK_ROOK))) {

            // Bishop can only walk diagonally, Rook only non-diagonally
            if (!isDiagonal && abs(fromFigure) == uint(Pieces(Piece.BLACK_BISHOP)) ||
                isDiagonal && abs(fromFigure) == uint(Pieces(Piece.BLACK_ROOK))) {
                throw;
            }

            // Traverse all fields in direction
            int temp = int(fromIndex);
            // walk in direction while inside board to find toIndex
            while (temp & 0x88 != 0) {
                if (uint(temp) == toIndex) {
                    return;
                }
                temp += direction;
            }

            throw;
        }

        // Pawns
        if (abs(fromFigure) == uint(Pieces(Piece.BLACK_PAWN))) {
            // Black can only move in positive, White negative direction
            if (fromFigure == Pieces(Piece.BLACK_PAWN) && direction < 0 ||
                fromFigure == Pieces(Piece.WHITE_PAWN) && direction > 0) {
                throw;
            }
            // Forward move
            if (!isDiagonal) {
                // no horizontal movement allowed
                if (abs(direction) < 2) {
                    throw;
                }
                // simple move
                if (int(fromIndex) + direction == int(toIndex)) {
                    return;
                }
                // double move
                if (int(fromIndex) + direction + direction == int(toIndex)) {
                    // Can only do double move starting form specific ranks
                    int rank = int(fromIndex/16);
                    if (1 == rank || 6 == rank) {
                        return;
                    }
                }
                throw;
            }
            // diagonal move
            if (int(fromIndex) + direction == int(toIndex)) {
                // if empty, the en passant flag needs to be set
                if (toFigure * fromFigure == 0) {
                    if (fromFigure == Pieces(Piece.BLACK_PAWN) &&
                        getFlag(gameId, Flag.WHITE_EN_PASSANT) == int(toIndex) ||
                        fromFigure == Pieces(Piece.WHITE_PAWN) &&
                        getFlag(gameId, Flag.BLACK_EN_PASSANT) == int(toIndex)) {
                        return;
                    }
                }
                // If not empty
                return;
            }

            throw;
        }

        // Knights
        if (abs(fromFigure) == uint(Pieces(Piece.BLACK_KNIGHT))) {
            for (uint i; i < 8; i++) {
                if (int(fromIndex) + int(knightMoves[i]) - 64 == int(toIndex)) {
                    return;
                }
            }
            throw;
        }

        throw;
    }


    /**
     * Checks if the way between fromIndex and toIndex is unblocked
     */
    function checkWayFree(bytes32 gameId, uint256 fromIndex, uint256 toIndex, int8 currentPlayerColor, bool shouldCheckForCheck) {
        int8 direction = getDirection(fromIndex, toIndex);
        int currentIndex = int(fromIndex) + direction;

        // as long as we do not reach the desired position walk in direction and check
        while (int(toIndex) != currentIndex) {
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
                throw;
            }
            currentIndex = currentIndex + direction;
        }
        return;
    }

    function checkForCheck(bytes32 gameId, uint256 kingAtIndex, int8 currentPlayerColor) returns (bool) {
        // TODO
        return true;
    }

    function getDirection(uint256 fromIndex, uint256 toIndex) returns (int8) {
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
            if (isSameVertical){
                return Directions(Direction.UP);
            }
            if (isSameHorizontal){
                return Directions(Direction.LEFT);
            }
            if (isLeftSide){
                return Directions(Direction.UP_LEFT);
            } else {
                return Directions(Direction.UP_RIGHT);
            }
        } else {
            if (isSameVertical){
                return Directions(Direction.DOWN);
            }
            if (isSameHorizontal){
                return Directions(Direction.RIGHT);
            }
            if (isLeftSide){
                return Directions(Direction.DOWN_LEFT);
            } else{
                return Directions(Direction.DOWN_RIGHT);
            }
        }
    }


    function makeTemporaryMove(bytes32 gameId, uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure){
        // remove all en passant flags
        setFlag(gameId, Flag.WHITE_EN_PASSANT, -1);
        setFlag(gameId, Flag.WHITE_EN_PASSANT, -1);


        // <---- Special Moves ---->

        // castling
        // it already passed valid we just need to move the rook

        // Black
        if (fromFigure == Pieces(Piece.BLACK_KING)){
            setFlag(gameId, Flag.BLACK_KING_POS, int8(toIndex));
            if ((fromIndex == 4)&&(toIndex == 2)){
                games[gameId].state[0] = 0;
                games[gameId].state[3] = Pieces(Piece.BLACK_ROOK);
            }
            if ((fromIndex == 4)&&(toIndex == 6)){
                games[gameId].state[7] = 0;
                games[gameId].state[5] = Pieces(Piece.BLACK_ROOK);
            }

        }
        // White
        if (fromFigure == Pieces(Piece.WHITE_KING)){
            setFlag(gameId, Flag.WHITE_KING_POS, int8(toIndex));
            if ((fromIndex == 116)&&(toIndex == 114)){
                games[gameId].state[112] = 0;
                games[gameId].state[115] = Pieces(Piece.BLACK_ROOK);
            }
            if ((fromIndex == 116)&&(toIndex == 118)){
                games[gameId].state[119] = 0;
                games[gameId].state[117] = Pieces(Piece.BLACK_ROOK);
            }

        }

        //Remove Castling Flag if king or Rook moves. But only at the first move for better performance

        // Black
        if (fromFigure == Pieces(Piece.BLACK_KING)){
            if (fromIndex == 4){
                setFlag(gameId, Flag.BLACK_LEFT_CASTLING, -1);
                setFlag(gameId, Flag.BLACK_RIGHT_CASTLING, -1);
            }
        }
        if (fromFigure == Pieces(Piece.BLACK_ROOK)){
            if (fromIndex == 0){
                setFlag(gameId, Flag.BLACK_LEFT_CASTLING, -1);
            }
            if (fromIndex == 7){
                setFlag(gameId, Flag.BLACK_RIGHT_CASTLING, -1);
            }
        }

        // White
        if (fromFigure == Pieces(Piece.WHITE_KING)){
            if (fromIndex == 116){
                setFlag(gameId, Flag.WHITE_LEFT_CASTLING, -1);
                setFlag(gameId, Flag.WHITE_RIGHT_CASTLING, -1);
            }
        }
        if (fromFigure == Pieces(Piece.WHITE_ROOK)){
            if (fromIndex == 112){
                setFlag(gameId, Flag.WHITE_LEFT_CASTLING, -1);
            }
            if (fromIndex == 119){
                setFlag(gameId, Flag.WHITE_RIGHT_CASTLING, -1);
            }
        }

        int8 direction = getDirection(fromIndex, toIndex);
        // En Passant - remove catched pawn
        // en passant if figure:pawn and diagonal move to empty field
        if(abs(fromFigure) == uint(Pieces(Piece.BLACK_PAWN)) && is_diagonal(direction) && toFigure == Pieces(Piece.EMPTY)){
            if(fromFigure == Pieces(Piece.BLACK_PAWN)){
                games[gameId].state[uint(int(toIndex) + Directions(Direction.UP))] = 0;
            }else{
                 games[gameId].state[uint(int(toIndex) + Directions(Direction.DOWN))] = 0;
            }
        }

        // Double Step


        // <---- Normal Moves --->

        games[gameId].state[toIndex] = games[gameId].state[fromIndex];
        games[gameId].state[fromIndex] = 0;

    }

    function isLegal() {

    }

    function testIfCheck() {

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
        if (value>=0) return uint256(value);
        else return uint256(-1*value);
    }

    function is_diagonal(int8 dir) internal returns (bool){
      if(abs(dir) == 16)
        return false;
      if(abs(dir) == 1)
        return false;
      return true;
    }

    /* This unnamed function is called whenever someone tries to send ether to it */
    function () {
        throw;     // Prevents accidental sending of ether
    }
}
