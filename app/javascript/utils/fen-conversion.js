function generatePieceMapping(){
  return {

    // for 0x88 to fen
    '-6': 'k',
    '-5': 'q',
    '-4': 'r',
    '-3': 'b',
    '-2': 'n',
    '-1': 'p',
    '1': 'P',
    '2': 'N',
    '3': 'B',
    '4': 'R',
    '5': 'Q',
    '6': 'K',

    // for fen to 0x88
    'k': -6,
    'q': -5,
    'r': -4,
    'b': -3,
    'n': -2,
    'p': -1,
    'P': 1,
    'N': 2,
    'B': 3,
    'R': 4,
    'Q': 5,
    'K': 6

  };
}

export function generateMapping () {
  let x = 0, y = 8;
  let toBackend = {};
  let toFrontend = {};
  let alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  for (let i = 0; i < 128; i++) {
    toBackend[alphabet[x] + y] = i;
    toFrontend[i] = alphabet[x] + y;

    x++;
    if (x === 8) {
      x = 0;
      y--;
      i += 8;
    }

  }

  return {'toBackend': toBackend, 'toFrontend': toFrontend};
}

/**
 * Convert Standard Algebraic Notation to 0x88 index
 * @param string: SAN string (e.g. 'a3')
 * @return number: Index in 0x88 board
 */
export function algebraicToIndex(string) {
  let alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  return (8-parseInt(string[1]))*16 + alphabet.indexOf(string[0]);
}

export function generateState(fen) {
  let fenComponents = fen.split(' ');
  let board = fenComponents[0],
      activeColor = fenComponents[1],
      castling = fenComponents[2],
      enPassant = fenComponents[3],
      // halfMoveClock = fenComponents[4],
      fullMoveCounter = fenComponents[5];

  // set board to 0x88
  let state = [];
  let counter = 0;
  let toState = generatePieceMapping();
  let whiteKing, blackKing;
  for (let i = 0; i < board.length; i++) {
    if (isNaN(Number(board[i]))) {
      if (board[i] === '/') {
        for (let k = 0; k < 8; k++) {
          state.push((0));
          counter++;
        }
      } else {
        state.push((toState[board[i]]));
        if (board[i] === 'k') {
          blackKing = counter;
        }
        if (board[i] === 'K') {
          whiteKing = counter;
        }
        counter++;
      }
    } else {
      for (let j = 0; j < Number(board[i]); j++) {
        state.push((0));
        counter++;
      }
    }
  }
  // fill rest of shadow field
  for (let j = 0; j < 8; j++) {
    state.push((0));
  }

  // fullmove
  let halfMoveCounter = 2 * fullMoveCounter + (activeColor === 'w' ? -2 : -1);
  state[8] = (parseInt(halfMoveCounter / 128));
  state[9] = (parseInt(halfMoveCounter % 128));

  // set king position
  state[11] = (blackKing);
  state[123] = (whiteKing);

  // set color
  if (activeColor === 'w') {
    state[56] = (1);
  } else {
    state[56] = (-1);
  }

  // init for castling
  state[78] = (-1);
  state[79] = (-1);
  state[62] = (-1);
  state[63] = (-1);

  // change state if castling is possible
  for (var k = 0; k < castling.length; k++) {
    // white right - kleine rochade für weiß
    if (castling[k] === 'K') {
      state[79] = 0;
    }
    // white left - große rochade für weiß
    else if (castling[k] === 'Q') {
      state[78] = 0;
    }
    // black right - kleine rochade für schwarz
    else if (castling[k] === 'k') {
      state[63] = 0;
    }
    // black left - große rochade für schwarz
    else if (castling[k] === 'q') {
      state[62] = 0;
    }
  }

  // set enpassant
  let mapping = generateMapping();
  state[61] = mapping.toBackend[enPassant];
  if (typeof state[61] === 'undefined') {
    state[61] = 0;
  }
  state[77] = mapping.toBackend[enPassant];
  if (typeof state[77] === 'undefined') {
    state[77] = 0;
  }

  return state;
}

export function generateFen(state) {
  let skip = 0, fen = '', zero = 0, toPiece = generatePieceMapping();

  for (var i = 0; i < state.length; i++) {
    // field is empty
    if (state[i] === 0) {
      zero += 1;
    }
    // field contains a piece
    else {

      // before concatinate piece to fen, check if zeros exist
      if (zero > 0) {
        fen += zero;
        zero = 0;
      }
      fen += toPiece[state[i]];
    }

    skip++;

    // shadow board
    if (skip === 8) {

      // concatinate rest to fen if exists
      if (zero > 0) {
        fen += zero;
        zero = 0;
      }

      // concatinate '/'
      if (i < 118) {
        fen += '/';
      }

      // skip shadow board and reset skip
      i += 8;
      skip = 0;
    }
  }

  // set current player
  if (state[56] === 1) {
    // white
    fen += ' w ';
  } else {
    // black
    fen += ' b ';
  }

  // set Rochade
  if (state[79] === 0 || state[78] === 0 ||
    state[62] === 0 || state[63] === 0) {
    if (state[79] === 0) {
      fen += 'K';
    }
    if (state[78] === 0) {
      fen += 'Q';
    }
    if (state[62] === 0) {
      fen += 'k';
    }
    if (state[63] === 0) {
      fen += 'q';
    }
  } else {
    fen += '-';
  }

  // set En passant
  if (state[61] > 0 || state[77] > 0) {
    let position = generateMapping();
    if (state[61] > 0) {
      fen += ' ' + position.toFrontend[state[61]];
    }
    else if (state[77] > 0) {
      fen += ' ' + position.toFrontend[state[77]];
    }
  } else {
    fen += ' -';
  }

  // set clock for halfmoves since last capture or pawn advance
  // not implemented, so always 0
  fen += ' 0 ';

  // set fullmove number
  let halfMoveCounter = 128 * state[8] + state[9];
  fen += Math.ceil((halfMoveCounter + 1) / 2);

  return fen;
}
