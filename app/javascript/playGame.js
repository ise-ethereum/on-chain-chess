/* global angular, Chess, Chessboard, ChessUtils */
import {Chess as SoliChess} from '../../contract/Chess.sol';

var BigNumber = require('bignumber.js');
angular.module('dappChess').controller('PlayGameCtrl',
  function (games, $route, navigation, $scope, $rootScope) {
    // init chess validation
    var chess, board, position, highlight, lastFrom, lastTo, currentFen, chessMove, gameState;

    $scope.gamePgn = '';
    $scope.gameStatus = '';

    function generateMapping() {
      let x=0, y=8;
      let toBackend = {};
      let toFrontend = {};
      let alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

      for ( let i=0 ; i < 128; i++){
        toBackend[alphabet[x] + y] = i;
        toFrontend[i] = alphabet[x] + y;

        x++;
        if (x===8) {
          x = 0;
          y --;
          i += 8;
        }

      }

      return {'toBackend':toBackend, 'toFrontend': toFrontend};

    }

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
        'k': '-6',
        'q': '-5',
        'r': '-4',
        'b': '-3',
        'n': '-2',
        'p': '-1',
        'P': '1',
        'N': '2',
        'B': '3',
        'R': '4',
        'Q': '5',
        'K': '6'

      };
    }

    function generateState(fen){


      let fenComponents = fen.split(' ');
      let board = fenComponents[0],
          activeColor = fenComponents[1],
          castling =  fenComponents[2],
          enPassant =  fenComponents[3],
          halfMoveClock = fenComponents[4],
          fullMoveCounter = fenComponents[5];
      console.log('board: ', board);
      console.log('Color: ',activeColor);
      console.log('enPAssant: ',enPassant);
      console.log('castling: ',castling);
      console.log('halfMove: ',halfMoveClock);
      console.log('fullmove: ',fullMoveCounter);

      // set board to 0x88
      let state = [];
      let counter = 0;
      let toState = generatePieceMapping();
      let whiteKing, blackKing;
      for (let i=0; i < board.length; i++){

        if (isNaN(Number(board[i])) ) {
          if (board[i] === '/') {
            for (let k=0; k < 8; k++) {
              state.push(new BigNumber(0));
              counter++;

            }
          } else {
            state.push(new BigNumber(toState[board[i]]));
            if (board[i] === 'K') {
              blackKing = counter;
            }
            if (board[i] === 'k') {
              whiteKing = counter;
            }
            counter++;
          }

        } else {
          for (let j=0; j < Number(board[i]); j++) {
            state.push(new BigNumber(0));
            counter++;
          }
        }


      }
      // fill rest of shadow field
      for (let j=0; j < 8; j++) {
        state.push(new BigNumber(0));
      }

      // fullmove
      console.log('high: ', Math.abs(parseInt(fullMoveCounter / 128)));
      console.log('low: ',(parseInt(((fullMoveCounter % 128) - 1)/2)));
      state[8] = new BigNumber(Math.abs(parseInt(fullMoveCounter / 128)));
      state[9] = new BigNumber(parseInt(((fullMoveCounter % 128) - 1) / 2));

      // set king position
      console.log('white king ', whiteKing);
      console.log('black king ', blackKing);
      state[11] = new BigNumber(blackKing);
      state[123] = new BigNumber(whiteKing);

      // set color
      if (activeColor === 'w') {
        state[56] = new BigNumber(1);
      } else {
        state[56] = new BigNumber(-1);
      }

      // init for castling
      state[78] = new BigNumber(-1);
      state[79] = new BigNumber(-1);
      state[62] = new BigNumber(-1);
      state[63] = new BigNumber(-1);

      // change state if castling is possible
      for (var k=0; castling < castling.length; k++) {

        // white right - kleine rochade für weiß
        if (castling[k] === 'K') {
          state[79] = new BigNumber(0);
        }
        // white left - große rochade für weiß
        else if (castling[k] === 'Q') {
          state[78] = new BigNumber(0);
        }
        // black right - kleine rochade für schwarz
        else if (castling[k] === 'k') {
          state[63] = new BigNumber(0);
        }
        // black left - große rochade für schwarz
        else if (castling[k] === 'q') {
          state[62] = new BigNumber(0);
        }
      }

      // set enpassant
      let mapping = generateMapping();
      state[61] = new BigNumber(mapping.toBackend[enPassant]);
      state[77] = new BigNumber(mapping.toBackend[enPassant]);

      console.log('STATE: ',state);

    }


    function generateFen(state) {
      let skip = 0, fen = '', zero = 0, toPiece = generatePieceMapping();

      for (var i=0; i < state.length; i++) {

        // field is empty
        if (state[i].isZero()) {
          zero += 1;
        }
        // field contains a piece
        else {

          // before concatinate piece to fen, check if zeros exist
          if (zero > 0) {
            fen += zero;
            zero = 0;
          }
          fen += toPiece[state[i].toNumber()];
        }

        skip ++;

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

      /*
      console.log('CURRENT_PLAYER: ', gameState[56].toNumber());
      console.log('BLACK_EN_PASSANT : ',  gameState[61].toNumber());
      console.log('WHITE_EN_PASSANT 7', gameState[77].toNumber());
      console.log('BLACK KING POSITION: ', position.toFrontend[gameState[11].toNumber()]);
      console.log('BLACK CASTLING LEFT: ', gameState[62].toNumber());
      console.log('BLACK CASTLING RIGHT: ', gameState[63].toNumber());
      console.log('WHITE CASTLING LEFT: ', gameState[78].toNumber());
      console.log('WHITE CASTLING RIGHT: ', gameState[79].toNumber());
      */
      // set current player

      if (state[56].toNumber() === 1) {
        // white
        fen += ' w ';
      } else {
        // black
        fen += ' b ';
      }

      // set Rochade
      if (state[79].toNumber() === 0 ||
        state[78].toNumber() === 0 || state[62].toNumber() === 0 || state[63].toNumber() === 0) {
        if (state[79].toNumber() === 0) {
          fen += 'K';
        }
        if (state[78].toNumber() === 0) {
          fen += 'Q';
        }
        if (state[62].toNumber() === 0) {
          fen += 'k';
        }
        if (state[63].toNumber() === 0) {
          fen += 'q';
        }
      } else {
        fen += '-';
      }

      // set En passant
      if (state[61].toNumber() > 0 || state[77].toNumber() > 0) {
        if (state[61].toNumber() > 0) {
          fen += ' ' + position.toFrontend[state[61].toNumber()];
        }
        if (state[77].toNumber() > 0) {
          fen += ' ' + position.toFrontend[state[77].toNumber()];
        }
      } else {
        fen += ' -';
      }


      // set halfmove clock
      fen +=' 0 ';

      // set fullmove number
      fen += ((2 * state[9].toNumber()) + state[8].toNumber()) + 1;



      return fen;
    }

    function lightItUp() {

      var xWhite=0, yWhite=8;
      var xBlack=7, yBlack=1;
      var alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      var playerWhite = {};
      var playerBlack = {};


      for ( var i=0 ; i < 64; i++){
        playerWhite[alphabet[xWhite] + yWhite] = i;
        playerBlack[alphabet[xBlack] + yBlack] = i;

        xWhite++;
        xBlack--;
        if (xWhite===8 && xBlack) {
          yWhite--;
          yBlack++;
          xWhite = 0;
          xBlack = 7;
        }
      }

      return {'playerWhite':playerWhite, 'playerBlack':playerBlack};
    }

    function checkOpenGame(gameId) {
      return games.openGames.indexOf(gameId) !== -1;
    }

    // Update game information to user
    function updateGameInfo(status) {
      $scope.gameStatus = status;
      $scope.gamePgn = chess.pgn();
      //$scope.gamePgn = chess.pgn().replace(/\[.*?\]\s+/g, '');

    }

    function claimWin(){
      let game = $scope.getGame();
      try {
        SoliChess.claimWin(game.gameId, {from: game.self.accountId});
        console.log('CLAIMWIN!');
      } catch(e) {
        console.log('CLAIMWIN ERROR: ', e);
      }
    }

    function offerDraw(){
      let game = $scope.getGame();
      try {
        SoliChess.offerDraw(game.gameId, {from: game.self.accountId});
        console.log('OFFERDRAW!');
      } catch(e) {
        console.log('OFFERDRAW! ERROR: ', e);
      }
    }


    function eventGameTimeoutStarted(err, data) {
      console.log('eventTimeoutStarted ', err, data);
      if (err){
        console.log('EVENTGAMETIMEOUTERROR: ', err);
      } else {
        let game = $scope.getGame();
        if (chess.turn() === 'w' && game.self.color === 'white'){
          console.log('Black win');
          try {
            SoliChess.confirmGameEnded(game.gameId, {from: game.self.accountId});
          } catch(e){
            console.log(e);
          }
        }
        else if (chess.turn() === 'b' && game.self.color === 'black') {
          console.log('White win');
          try {
            SoliChess.confirmGameEnded(game.gameId, {from: game.self.accountId});
          } catch(e) {
            console.log(e);
          }
        }
      }

    }

    function eventMove(err, data) {
      console.log('eventMove', err, data);
      if(err) {
        //
      }
      else {
        let fromIndex = position.toFrontend[data.args.fromIndex.c[0]];
        let toIndex = position.toFrontend[data.args.toIndex.c[0]];

        // display move to enemy
        if (!board.isUserInputEnabled()) {
          chessMove = chess.move({
            from: fromIndex,
            to: toIndex,
            promotion: 'q'
          });
          board.move(fromIndex + '-' + toIndex);
        }
        processChessMove(chessMove);

        if(board.isUserInputEnabled()) {
          $rootScope.$broadcast('message', 'Your move was successfully transmitted.',
            'success', 'playgame-' + $scope.getGameId());
        }
        $rootScope.$apply();

        board.enableUserInput(!board.isUserInputEnabled());
      }
    }

    // player clicked on chess piece
    function pieceSelected(notationSquare) {
      var i,
        movesNotation,
        movesPosition = [];

      movesNotation = chess.moves({square: notationSquare, verbose: true});
      for (i = 0; i < movesNotation.length; i++) {
        movesPosition.push(ChessUtils.convertNotationSquareToIndex(movesNotation[i].to));
      }
      return movesPosition;
    }

    // move chess piece if valid


    $scope.getGameId = function() {
      return $route.current.params.id;
    };
    $scope.isOpenGame = function() {
      let gameId = $scope.getGameId();

      if(gameId) {
        return checkOpenGame(gameId);
      }

      return false;
    };
    $scope.getGame = function() {
      let gameId = $scope.getGameId();

      if(gameId) {
        return games.getGame(gameId);
      }

      return false;
    };
    $scope.surrender = function() {
      $rootScope.$broadcast('message', 'Submitting your surrender, please wait...',
        'loading', 'playgame');
      try {
        console.log('calling Chess.surrender(' + $scope.getGameId() + ')');
        SoliChess.surrender($scope.getGameId(), {from: $scope.getGame().self.accountId});
      }
      catch(e) {
        $rootScope.$broadcast('message', 'Could not submit your surrender', 'loading', 'playgame');
      }
    };

    $scope.gameIsWon = function() {
      let game = $scope.getGame();
      if(game) {
        return typeof(game.winner) !== 'undefined' && game.winner === 'self';
      }

      return false;
    };

    $scope.gameIsLost = function() {
      let game = $scope.getGame();
      if(game) {
        return typeof(game.winner) !== 'undefined' && game.winner === 'opponent';
      }

      return false;
    };

    $scope.gameIsDraw = function() {
      let game = $scope.getGame();
      if(game) {
        return game.ended && (typeof(game.winner) === 'undefined' ||
          (game.winner !== 'self' && game.winner !== 'opponent'));
      }

      return false;
    };

    $scope.gameIsActive = function() {
      let game = $scope.getGame();

      if(game) {
        return !game.ended;
      }

      return false;
    };

    $scope.gameHasClaimableEther = function() {
      let game = $scope.getGame();

      if(game) {
        return game.self.wonEther > 0;
      }

      return false;
    };

    $scope.claimEther = function() {
      games.claimEther($scope.getGame());
    };

    $scope.closeGame = function() {
      SoliChess.closePlayerGame($scope.getGameId(), {from: $scope.getGame().self.accountId});
      $rootScope.$broadcast('message', 'Closing your game, please wait...',
        'loading', 'playgame');
    };


    // OFF-CHAIN -------------------------------------------------------------------------------------------------------

    function processChessMoveOffChain(chessMove) {

      board.enableUserInput(!board.isUserInputEnabled());
      console.log('Set Column color');
      let game = $scope.getGame();
      let highlights = lightItUp();

      var fromW = highlights.playerWhite[chessMove.from];
      var toW = highlights.playerWhite[chessMove.to];
      var fromB = highlights.playerBlack[chessMove.from];
      var toB = highlights.playerBlack[chessMove.to];

      if (lastFrom !== null){
        $('#my-board_chess_square_' + lastFrom).removeClass('chess_square_moved');
        $('#my-board_chess_square_' + lastTo).removeClass('chess_square_moved');
      }

      if (game.self.color === 'white') {
        $('#my-board_chess_square_' + fromW).addClass('chess_square_moved');
        $('#my-board_chess_square_' + toW).addClass('chess_square_moved');
        lastFrom = fromW;
        lastTo = toW;

      } else {
        $('#my-board_chess_square_' + fromB).addClass('chess_square_moved');
        $('#my-board_chess_square_' + toB).addClass('chess_square_moved');
        lastFrom = fromB;
        lastTo = toB;
      }


      let nextPlayer, status,
        userColor = (game.self.color === 'white') ? 'w' :  'b';
      if (chessMove !== null) {
        // define next player
        if (userColor === chess.turn()) {
          nextPlayer = game.self.username;

          //chess.enableUserInput(false);
        } else {
          nextPlayer = game.opponent.username;
          //chess.enableUserInput(true);
        }

        // game over?
        if (chess.in_checkmate() === true) { // jshint ignore:line
          status = 'CHECKMATE! ' + nextPlayer + ' lost.';
          if (chess.turn() === 'b' && game.self.color === 'white') {
            // ToDo
          }
          if (chess.turn() === 'w' && game.self.color === 'black') {
            // ToDo
          }

        }
        // draw?
        else if (chess.in_draw() === true) { // jshint ignore:line
          status = 'DRAW!';
          // ToDo
        }

        // stalemate?
        else if (chess.in_stalemate() === true) { // jshint ignore:line
          status = 'STALEMATE!';
          // ToDO
        }

        // game is still on
        else {
          status = 'Next player is ' + nextPlayer + '.';

          // plaver in check?
          if (chess.in_check() === true) { // jshint ignore:line
            status = 'CHECK! ' + status;
          }
        }
      }
      updateGameInfo(status);
    }

    function pieceMoveOffChain(move) {
      let game = $scope.getGame();

      // move piece from ... to
      chessMove = chess.move({
        from: move.from,
        to: move.to,
        promotion: 'q'
      });

      // offchain chess
      if (chessMove !== null) {
        games.sendMove(game, move.from, move.to);

        processChessMoveOffChain(chessMove);
      } else {
        // ToDo Nothing happens?
      }

      return chess.fen();
    }

    let listenForMoves = function() {

      let game = $scope.getGame();
      games.listenForMoves(game, function(m) {

        let [msgType, state, stateSignature, fromIndex, toIndex, moveSignature] = m.payload;
        console.log("proxy move event");
        console.log(m);
        console.log(toIndex);

        let opponentChessMove = chess.move({
          from: fromIndex,
            to: toIndex,
            promotion: 'q'
        });

        if (opponentChessMove !== null) {
          board.move(fromIndex+ '-' + toIndex);
          processChessMoveOffChain(opponentChessMove);
        } else {
          // ToDo
        }

      });

    };

    let initGameOffChain = function(game) {

      // init chess.js and chessboard.js
      chess = new Chess();
      board = new Chessboard('my-board', {
          position: chess.fen(),
          eventHandlers: {
            onPieceSelected: pieceSelected,
            onMove: pieceMoveOffChain
          }
        }
      );

      // set board orientation and disable black player to click
      if (game.self.color === 'black') {
        board.setOrientation(ChessUtils.ORIENTATION.black);
        board.enableUserInput(false);
      }

      // Update game information
      let gamer;
      if (chess.turn() === 'w') {
        gamer = 'white';
      } else {
        gamer = 'black';
      }

      updateGameInfo('Next player is ' + gamer + '.', false);

    };

    // OFF-CHAIN END----------------------------------------------------------------------------------------------------

    // ON-CHAIN -------------------------------------------------------------------------------------------------------
    /*
    function processChessMove(chessMove) {

      let game = $scope.getGame();
      console.log('chessMove');

      var fromW = highlight.playerWhite[chessMove.from];
      var toW = highlight.playerWhite[chessMove.to];
      var fromB = highlight.playerBlack[chessMove.from];
      var toB = highlight.playerBlack[chessMove.to];

      if (lastFrom !== null){
        $('#my-board_chess_square_' + lastFrom).removeClass('chess_square_moved');
        $('#my-board_chess_square_' + lastTo).removeClass('chess_square_moved');
      }

      if (game.self.color === 'white') {
        $('#my-board_chess_square_' + fromW).addClass('chess_square_moved');
        $('#my-board_chess_square_' + toW).addClass('chess_square_moved');
        lastFrom = fromW;
        lastTo = toW;

      } else {
        $('#my-board_chess_square_' + fromB).addClass('chess_square_moved');
        $('#my-board_chess_square_' + toB).addClass('chess_square_moved');
        lastFrom = fromB;
        lastTo = toB;
      }

      // TESTING FEN
      try {
        gameState = SoliChess.getCurrentGameState(game.gameId, {from: game.self.accountId});
        console.log(gameState);
        currentFen = generateFen(gameState);
      } catch(e) {
        console.log(e);
      }


      let nextPlayer, status,
        userColor = (game.self.color === 'white') ? 'w' :  'b';
      if (chessMove !== null) {
        console.log('chessMove !== null');
        // define next player
        if (userColor === chess.turn()) {
          nextPlayer = game.self.username;

          //chess.enableUserInput(false);
        } else {
          nextPlayer = game.opponent.username;
          //chess.enableUserInput(true);
        }

        // game over?
        if (chess.in_checkmate() === true) { // jshint ignore:line
          status = 'CHECKMATE! ' + nextPlayer + ' lost.';
          if (chess.turn() === 'b' && game.self.color === 'white') {
            claimWin();
          }
          if (chess.turn() === 'w' && game.self.color === 'black') {
            claimWin();
          }

        }

        // draw?
        else if (chess.in_draw() === true) { // jshint ignore:line
          status = 'DRAW!';
          offerDraw();
        }

        // stalemate?
        else if (chess.in_stalemate() === true) { // jshint ignore:line
          status = 'STALEMATE!';
          offerDraw();
        }

        // game is still on
        else {
          status = 'Next player is ' + nextPlayer + '.';

          // plaver in check?
          if (chess.in_check() === true) { // jshint ignore:line
            status = 'CHECK! ' + status;
            // ToDo: set 'danger' color for king
            console.log('css');
          }
        }
      }
      updateGameInfo(status);
    }



    function pieceMoveOnChain(move) {
      let game = $scope.getGame();

      // move piece from ... to
      chessMove = chess.move({
        from: move.from,
        to: move.to,
        promotion: 'q'
      });
      board.move(move.from+ '-' + move.to);

      // offchain chess
      games.sendMove(game, move.from, move.to);

      try {
        $rootScope.$broadcast('message', 'Submitting your move, please wait a moment...',
          'loading', 'playgame-' + game.gameId);
        $rootScope.$apply();

        let fromIndex = position.toBackend[move.from];
        let toIndex = position.toBackend[move.to];

        SoliChess.move(game.gameId, fromIndex, toIndex, {from: game.self.accountId});

      } catch(e) {
        console.log(e);

        // undo move if error
        chess.undo();
        board.move(move.to + '-' + move.from);

        $rootScope.$broadcast('message', 'Could not validate your move',
          'error', 'playgame-' + game.gameId);
        $rootScope.$apply();
      }

      return chess.fen();
    }

    let initGameOnChess = function (game) {
      chess = new Chess();
      highlight = lightItUp();

      // set current fen
      try {
        gameState = SoliChess.getCurrentGameState(game.gameId, {from: game.self.accountId});
        currentFen = generateFen(gameState);
        console.log('Soli gamestate: ', gameState);

      } catch (e) {
        console.log(e);
      }


      board = new Chessboard('my-board', {
          position: currentFen,
          eventHandlers: {
            onPieceSelected: pieceSelected,
            onMove: pieceMoveOnChain
          }
        }
      );

      chess.load(currentFen);

      let gamer;
      if (gameState[56].toNumber() === 1) {
        gamer = 'white';
      } else {
        gamer = 'black';
      }

      updateGameInfo('Next player is ' + gamer + '.', false);

      position = generateMapping();

      // opponent starts game
      if (game.self.color === 'black') {
        board.setOrientation(ChessUtils.ORIENTATION.black);
        if (gameState[56].toNumber() === 1) {
          board.enableUserInput(false);
        }
      } else {
        if (gameState[56].toNumber() === -1) {
          board.enableUserInput(false);
        }
      }

      // set events
      SoliChess.Move(eventMove);
      SoliChess.GameTimeoutStarted(eventGameTimeoutStarted);
    };

    // ON-CHAIN END----------------------------------------------------------------------------------------------------
    */
    //--- init Chessboard ---
    if (!$scope.isOpenGame()) {
      let game = $scope.getGame();

      if(game) {
        $(document).ready(function () {

          // OFF-CAHIN
          listenForMoves();
          initGameOffChain(game);

          // ON-CHAIN
          //initGameOnChess(game);
        });
      }
      else {
        navigation.goto(navigation.welcomePage);
        $rootScope.$broadcast('message', 'No game with the specified id exists',
          'error', 'playgame');
      }
    }
  }
);
