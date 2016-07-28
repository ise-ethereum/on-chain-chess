library ChessLogic {
    struct State {
        int8[128] fields;
        address playerWhite;
    }


    // default state array, all numbers offset by +8
    bytes constant defaultState = '\x04\x06\x05\x03\x02\x05\x06\x04\x08\x08\x08\x0c\x08\x08\x08\x08\x07\x07\x07\x07\x07\x07\x07\x07\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x08\x09\x09\x09\x09\x09\x09\x09\x09\x08\x08\x08\x08\x08\x08\x08\x08\x0c\x0a\x0b\x0d\x0e\x0b\x0a\x0c\x08\x08\x08\x7c\x08\x08\x08\x08';

    /* Flags needed for validation
     * Usage e.g. Flags(Flag.FLAG_NAME), Directions(Direction.UP), Players(Player.WHITE)
     * Because there are no constant arrays in Solidity, we use byte literals that
     * contain the needed numbers encoded as hex characters. We can only encode
     * positive numbers this way, so if negative flags are needed, all values are
     * stored shifted and later un-shifted in the accessors.
     */
    enum Player { WHITE,      //  1
                  BLACK }     // -1

    enum Piece { BLACK_KING,  // -6
                 BLACK_QUEEN, // -5
                 BLACK_ROOK,  // -4
                 BLACK_BISHOP,// -3
                 BLACK_KNIGHT,// -2
                 BLACK_PAWN,  // -1
                 EMPTY,       //  0
                 WHITE_PAWN,  //  1
                 WHITE_KNIGHT,//  2
                 WHITE_BISHOP,//  3
                 WHITE_ROOK,  //  4
                 WHITE_QUEEN, //  5
                 WHITE_KING } //  6

    enum Direction { UP,         //  16
                     UP_RIGHT,   //  15
                     RIGHT,      //   1
                     DOWN_RIGHT, // -17
                     DOWN,       // -16
                     DOWN_LEFT,  // -15
                     LEFT,       //  -1
                     UP_LEFT }   //  17

    bytes constant c_Directions = "\x30\x31\x41\x51\x50\x4f\x3f\x2f";
    //                             [-16,-15,  1, 17, 16, 15, -1,-17] shifted by +64

    enum Flag { MOVE_COUNT_H,         // 8
                MOVE_COUNT_L,         // 9
                WHITE_KING_POS,       // 123
                BLACK_KING_POS,       // 11
                CURRENT_PLAYER,       // 56
                WHITE_LEFT_CASTLING,  // 78
                WHITE_RIGHT_CASTLING, // 79
                BLACK_LEFT_CASTLING,  // 62
                BLACK_RIGHT_CASTLING, // 63
                BLACK_EN_PASSANT,     // 61
                WHITE_EN_PASSANT}     // 77

    bytes constant c_Flags = "\x08\x09\x7b\x0b\x38\x4e\x4f\x3e\x3f\x3d\x4d";
    //                        [  8,  9,123, 11, 56, 78, 79, 62, 63, 61, 77]

    bytes constant knightMoves = '\x1f\x21\x2e\x32\x4e\x52\x5f\x61';
    //                             [-33,-31,-18,-14,14, 18, 31, 33] shifted by +64

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

    /**
     * Convenience function to set a flag
     * Usage: setFlag(state, Flag.BLACK_KING_POS, 4);
     */
    function setFlag(State storage self, Flag flag, int value) internal {
        self.fields[Flags(flag)] = int8(value);
    }

    /**
     * Convenience function to set a flag
     * Usage: getFlag(state, Flag.BLACK_KING_POS);
     */
    function getFlag(State storage self, Flag flag) constant internal returns (int8) {
        return self.fields[Flags(flag)];
    }


    function setupState(State storage self, int8 nextPlayerColor) {
        // Initialize state
        for (uint i = 0; i < 128; i++) {
            // Read defaultState bytes string, which is offset by 8 to be > 0
            self.fields[i] = int8(defaultState[i]) - 8;
        }
        setFlag(self, Flag.CURRENT_PLAYER, nextPlayerColor);
    }

    function setState(State storage self, int8[128] newState, int8 nextPlayerColor) {
        self.fields = newState;
        setFlag(self, Flag.CURRENT_PLAYER, nextPlayerColor);
    }

    /* validates a move and executes it */
    function move(State storage self, uint256 fromIndex, uint256 toIndex, bool isWhite) public {
        int8 currentPlayerColor;
        if (isWhite) {
            currentPlayerColor = Players(Player.WHITE);
        } else {
            currentPlayerColor = Players(Player.BLACK);
        }

        int8 fromFigure = self.fields[fromIndex];
        int8 toFigure = self.fields[toIndex];

        // Simple sanity checks
        sanityCheck(fromIndex, toIndex, fromFigure, toFigure, currentPlayerColor);

        // Check if move is technically possible
        if (!validateMove(self, fromIndex, toIndex, fromFigure, toFigure, currentPlayerColor)) {
            throw;
        }

        // For all pieces except knight, check if way is free
        if (abs(fromFigure) != uint(Pieces(Piece.WHITE_KNIGHT))) {
            // In case of king, it will check that he is not in check on any of the fields he moves over
            bool checkForCheck = abs(fromFigure) == uint(Pieces(Piece.WHITE_KING));
            checkWayFree(self, fromIndex, toIndex, currentPlayerColor, checkForCheck);

            // Check field between rook and king in case of castling
            if (fromFigure == Pieces(Piece.BLACK_KING) && toIndex == 2 && self.fields[1] != 0 ||
                fromFigure == Pieces(Piece.WHITE_KING) && toIndex == 114 && self.fields[113] != 0) {
                throw;
            }
        }
        // Make the move
        makeMove(self, fromIndex, toIndex, fromFigure, toFigure);

        // Check legality (player's own king may not be in check after move)
        checkLegality(self, fromIndex, toIndex, fromFigure, toFigure, currentPlayerColor);
        // Update move count
        // High and Low are int8, so from -127 to 127
        // By using two flags we extend the positive range to 14 bit, 0 to 16384
        int16 moveCount = int16(getFlag(self, Flag.MOVE_COUNT_H)) * (2**7) | int16(getFlag(self, Flag.MOVE_COUNT_L));
        moveCount += 1;
        if (moveCount > 127) {
            setFlag(self, Flag.MOVE_COUNT_H, moveCount / (2**7));
        }
        setFlag(self, Flag.MOVE_COUNT_L, moveCount % 128);

        // Update nextPlayer
        int8 nextPlayerColor = currentPlayerColor == Players(Player.WHITE) ? Players(Player.BLACK) : Players(Player.WHITE);
        setFlag(self, Flag.CURRENT_PLAYER, nextPlayerColor);
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
    function validateMove(State storage self, uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure, int8 movingPlayerColor) returns (bool) {
        int direction = int(getDirection(fromIndex, toIndex));
        bool isDiagonal = !(abs(direction) == 16 || abs(direction) == 1);

        // Kings
        if (abs(fromFigure) == uint(Pieces(Piece.WHITE_KING))) {
            // Normal move
            if (int(fromIndex) + direction == int(toIndex)) {
                return true;
            }
            // Cannot castle if already in check
            if (checkForCheck(self, fromIndex, movingPlayerColor)) {
                return false;
            }
            // Castling
            if (fromFigure == Pieces(Piece.BLACK_KING)) {
                if (4 == fromIndex && toFigure == 0) {
                    if (toIndex == 2 && getFlag(self, Flag.BLACK_LEFT_CASTLING) >= 0) {
                        return true;
                    }
                    if (toIndex == 6 && getFlag(self, Flag.BLACK_RIGHT_CASTLING) >= 0) {
                        return true;
                    }
                }
            }
            if (fromFigure == Pieces(Piece.WHITE_KING)) {
                if (116 == fromIndex && toFigure == 0) {
                    if (toIndex == 114 && getFlag(self, Flag.WHITE_LEFT_CASTLING) >= 0) {
                        return true;
                    }
                    if (toIndex == 118 && getFlag(self, Flag.WHITE_RIGHT_CASTLING) >= 0) {
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
            // while (temp & 0x88 == 0) {
            for (uint j = 0; j < 8; j++) {
                if (temp == int(toIndex)) {
                    return true;
                }
                temp = temp + direction;
                if (temp & 0x88 != 0) return false;
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
                        getFlag(self, Flag.WHITE_EN_PASSANT) == int(toIndex) ||
                        fromFigure == Pieces(Piece.WHITE_PAWN) &&
                        getFlag(self, Flag.BLACK_EN_PASSANT) == int(toIndex)) {
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
    function checkWayFree(State storage self, uint256 fromIndex, uint256 toIndex, int8 currentPlayerColor, bool shouldCheckForCheck) internal {
        int8 direction = getDirection(fromIndex, toIndex);
        int currentIndex = int(fromIndex) + direction;

        // as long as we do not reach the desired position walk in direction and check
        while (int(toIndex) != currentIndex) {
            // we reached the end of the field
            if (currentIndex & 0x88 != 0) {
                throw;
            }
            // the path is blocked
            if (self.fields[uint(currentIndex)] != 0) {
                throw;
            }
            // Check for check in case of king
            if (shouldCheckForCheck && checkForCheck(self, uint(currentIndex), currentPlayerColor)) {
                throw;
            }
            currentIndex = currentIndex + direction;
        }
        return;
    }

    function checkForCheck(State storage self, uint256 kingIndex, int8 currentPlayerColor) internal returns (bool) {
        // look in every direction whether there is an enemy figure that checks the king
        for (uint dir = 0; dir < 8; dir ++) {
            // get the first Figure in this direction. Threat of Knight does not change through move of fromFigure.
            // All other figures can not jump over figures. So only the first figure matters.
            int8 firstFigureIndex = getFirstFigure(self, Directions(Direction(dir)), int8(kingIndex));

            // if we found a figure in the danger direction
            if (firstFigureIndex != -1) {
                int8 firstFigure = self.fields[uint(firstFigureIndex)];

                // if its an enemy
                if (firstFigure * currentPlayerColor < 0) {
                    // check if the enemy figure can move to the field of the king
                    int8 kingFigure = Pieces(Piece.WHITE_KING) * currentPlayerColor;

                    if (validateMove(self, uint256(firstFigureIndex), uint256(kingIndex), firstFigure, kingFigure, currentPlayerColor)) {
                        // it can
                        return true; // king is checked
                    }
                }
            }
        }

        //Knights
        // Knights can jump over figures. So they need to be tested seperately with every possible move.
        for (uint move = 0; move < 8; move ++){
            // currentMoveIndex: where knight could start with move that checks king
            int8 currentMoveIndex = int8(kingIndex) + int8(knightMoves[move]) - 64;

            // if inside the board
            if (uint(currentMoveIndex) & 0x88 == 0){

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

    function makeMove(State storage self, uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure) internal {
        // remove all en passant flags
        setFlag(self, Flag.WHITE_EN_PASSANT, 0);
        setFlag(self, Flag.BLACK_EN_PASSANT, 0);

        // <---- Special Move ---->

        // Black King
        if (fromFigure == Pieces(Piece.BLACK_KING)) {
            // Update position flag
            setFlag(self, Flag.BLACK_KING_POS, int8(toIndex));
            // Castling
            if (fromIndex == 4 && toIndex == 2) {
                self.fields[0] = 0;
                self.fields[3] = Pieces(Piece.BLACK_ROOK);
            }
            if (fromIndex == 4 && toIndex == 6) {
                self.fields[7] = 0;
                self.fields[5] = Pieces(Piece.BLACK_ROOK);
            }

        }
        // White King
        if (fromFigure == Pieces(Piece.WHITE_KING)) {
            // Update position flag
            setFlag(self, Flag.WHITE_KING_POS, int8(toIndex));
            // Castling
            if (fromIndex == 116 && toIndex == 114) {
                self.fields[112] = 0;
                self.fields[115] = Pieces(Piece.WHITE_ROOK);
            }
            if (fromIndex == 116 && toIndex == 118) {
                self.fields[119] = 0;
                self.fields[117] = Pieces(Piece.WHITE_ROOK);
            }

        }

        // Remove Castling Flag if king or Rook moves. But only at the first move for better performance

        // Black
        if (fromFigure == Pieces(Piece.BLACK_KING)) {
            if (fromIndex == 4) {
                setFlag(self, Flag.BLACK_LEFT_CASTLING, -1);
                setFlag(self, Flag.BLACK_RIGHT_CASTLING, -1);
            }
        }
        if (fromFigure == Pieces(Piece.BLACK_ROOK)) {
            if (fromIndex == 0) {
                setFlag(self, Flag.BLACK_LEFT_CASTLING, -1);
            }
            if (fromIndex == 7) {
                setFlag(self, Flag.BLACK_RIGHT_CASTLING, -1);
            }
        }

        // White
        if (fromFigure == Pieces(Piece.WHITE_KING)) {
            if (fromIndex == 116) {
                setFlag(self, Flag.WHITE_LEFT_CASTLING, -1);
                setFlag(self, Flag.WHITE_RIGHT_CASTLING, -1);
            }
        }
        if (fromFigure == Pieces(Piece.WHITE_ROOK)) {
            if (fromIndex == 112) {
                setFlag(self, Flag.WHITE_LEFT_CASTLING, -1);
            }
            if (fromIndex == 119) {
                setFlag(self, Flag.WHITE_RIGHT_CASTLING, -1);
            }
        }

        int8 direction = getDirection(fromIndex, toIndex);

        // PAWN - EN PASSANT or DOUBLE STEP
        if (abs(fromFigure) == uint(Pieces(Piece.WHITE_PAWN))) {
            // En Passant - remove caught pawn
            // en passant if figure: pawn and diagonal move to empty field
            if (is_diagonal(direction) && toFigure == Pieces(Piece.EMPTY)) {
                if (fromFigure == Pieces(Piece.BLACK_PAWN)) {
                    self.fields[uint(int(toIndex) + Directions(Direction.UP))] = 0;
                } else {
                    self.fields[uint(int(toIndex) + Directions(Direction.DOWN))] = 0;
                }
            }

            // in case of double Step: set EN_PASSANT-Flag
            else if (int(fromIndex) + direction + direction == int(toIndex)) {
                if (fromFigure == Pieces(Piece.BLACK_PAWN)) {
                    setFlag(self, Flag.BLACK_EN_PASSANT, int8(toIndex) + Directions(Direction.UP));
                } else {
                    setFlag(self, Flag.WHITE_EN_PASSANT, int8(toIndex) + Directions(Direction.DOWN));
                }
            }
        }

        // <---- Promotion --->

        int targetRank = int(toIndex/16);
        if (targetRank == 7 && fromFigure == Pieces(Piece.BLACK_PAWN)) {
            self.fields[toIndex] = Pieces(Piece.BLACK_QUEEN);
        }
        else if (targetRank == 0 && fromFigure == Pieces(Piece.WHITE_PAWN)) {
            self.fields[toIndex] = Pieces(Piece.WHITE_QUEEN);
        }
        else {
            // Normal move
            self.fields[toIndex] = self.fields[fromIndex];
        }

        self.fields[fromIndex] = 0;
    }

    // checks whether movingPlayerColor's king gets checked by move
    function checkLegality(State storage self, uint256 fromIndex, uint256 toIndex, int8 fromFigure, int8 toFigure, int8 movingPlayerColor) internal returns (bool){
        // Piece that was moved was the king
        if (abs(fromFigure) == uint(Pieces(Piece.WHITE_KING))) {
            if (checkForCheck(self, uint(toIndex), movingPlayerColor)) {
                throw;
            }
            // Else we can skip the rest of the checks
            return;
        }

        int8 kingIndex = getOwnKing(self, movingPlayerColor);

        // Moved other piece, but own king is still in check
        if (checkForCheck(self, uint(kingIndex), movingPlayerColor)) {
            throw;
        }


        // through move of fromFigure away from fromIndex,
        // king may now be in danger from that direction
        int8 kingDangerDirection = getDirection(uint256(kingIndex), fromIndex);
        // get the first Figure in this direction. Threat of Knight does not change through move of fromFigure.
        // All other figures can not jump over other figures. So only the first figure matters.
        int8 firstFigureIndex = getFirstFigure(self, kingDangerDirection,kingIndex);

        // if we found a figure in the danger direction
        if (firstFigureIndex != -1) {
            int8 firstFigure = self.fields[uint(firstFigureIndex)];

            // if its an enemy
            if (firstFigure * movingPlayerColor < 0) {
                // check if the figure can move to the field of the king
                int8 kingFigure = Pieces(Piece.BLACK_KING) * movingPlayerColor;
                if (validateMove(self, uint256(firstFigureIndex), uint256(kingIndex), firstFigure, kingFigure, movingPlayerColor)) {
                    // it can
                    throw;
                }
            }
        }

        return;
    }

    // gets the first figure in direction from start, not including start
    function getFirstFigure(State storage self, int8 direction, int8 start) returns (int8){
        int currentIndex = start + direction;

        // as long as we do not reach the end of the board walk in direction
        while (currentIndex & 0x88 == 0){
            // if there is a figure at current field return it
            if (self.fields[uint(currentIndex)] != Pieces(Piece.EMPTY))
                return int8(currentIndex);

            // otherwise move to the next field in that direction
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

    function getOwnKing(State storage self, int8 movingPlayerColor) returns (int8){
        if (movingPlayerColor == Players(Player.WHITE))
            return getFlag(self, Flag.WHITE_KING_POS);
        else
            return getFlag(self, Flag.BLACK_KING_POS);
    }

    function boolToInt(bool value) returns (int) {
        if (value) {
            return 1;
        } else {
            return 0;
        }
    }

}
