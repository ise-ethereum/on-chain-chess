/* global angular, Chess, Chessboard, ChessUtils */
import {Chess as SoliChess} from '../../contract/Chess.sol';
angular.module('dappChess').controller('PlayGameCtrl',
  function (games, $route, navigation, $scope, $rootScope) {
    // init chess validation
    var chess, board, position, highlight, lastFrom, lastTo, currentFen, chessMove, gameState;

    $scope.gamePgn = '';
    $scope.gameStatus = '';


    function generatePieceMapping(){
      return {
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
        '6': 'K'
      };
    }

    function generateState(fen){
      let x = fen.split(' ');
      // let board, currentPlayer, enPassant, castling, moveCount = fen.split(' ');
      console.log(x);


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


      console.log('CURRENT_PLAYER: ', gameState[56].toNumber());
      console.log('BLACK_EN_PASSANT : ',  gameState[61].toNumber());
      console.log('WHITE_EN_PASSANT 7', gameState[77].toNumber());
      console.log('BLACK KING POSITION: ', position.toFrontend[gameState[11].toNumber()]);
      console.log('BLACK CASTLING LEFT: ', gameState[62].toNumber());
      console.log('BLACK CASTLING RIGHT: ', gameState[63].toNumber());
      console.log('WHITE CASTLING LEFT: ', gameState[78].toNumber());
      console.log('WHITE CASTLING RIGHT: ', gameState[79].toNumber());

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
      fen += state[9].toNumber() + state[8].toNumber() + 1;



      return fen;
    }

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
      $scope.gamePgn = chess.pgn().replace(/\[.*?\]\s+/g, '');

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

    function processChessMove(chessMove) {

      let game = $scope.getGame();
      console.log('chessMove');


      /*
      console.log(chessMove);
      console.log('from: ' + chessMove.from);
      console.log('to: ' + chessMove.to);
      */
      var fromW = highlight.playerWhite[chessMove.from];
      var toW = highlight.playerWhite[chessMove.to];
      var fromB = highlight.playerBlack[chessMove.from];
      var toB = highlight.playerBlack[chessMove.to];
      /*
      console.log('fromW: ', fromW, ' toW: ', toW);
      console.log('fromW: ', fromB, ' toW: ', toB);
      */
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
        currentFen = generateFen(gameState);
        console.log('GAMESTATE: ', gameState);
        console.log('GENERATED FEN: ', currentFen);
        console.log('REAL FEN: ', chess.fen());
        console.log('CURRENT_PLAYER: ', gameState[56].toNumber());
        console.log('BLACK_EN_PASSANT : ',  gameState[61].toNumber());
        console.log('WHITE_EN_PASSANT 7', gameState[77].toNumber());
        console.log('BLACK KING POSITION: ', position.toFrontend[gameState[11].toNumber()]);
        console.log('WHITE KING POSITION: ', position.toFrontend[gameState[123].toNumber()]);
        console.log('BLACK CASTLING LEFT: ', gameState[62].toNumber());
        console.log('BLACK CASTLING RIGHT: ', gameState[63].toNumber());
        console.log('WHITE CASTLING LEFT: ', gameState[78].toNumber());
        console.log('WHITE CASTLING RIGHT: ', gameState[79].toNumber());
      } catch(e) {
        console.log('ERROR');
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
          claimWin();
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

      }
      else {
        let fromIndex = position.toFrontend[data.args.fromIndex.c[0]];
        let toIndex = position.toFrontend[data.args.toIndex.c[0]];

        console.log(chess.fen());

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


        console.log(chess.fen());



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
    function pieceMove(move) {
      let game = $scope.getGame();

      // move piece from ... to
      chessMove = chess.move({
        from: move.from,
        to: move.to,
        promotion: 'q'
      });
      board.move(move.from+ '-' + move.to);

      try {
        $rootScope.$broadcast('message', 'Submitting your move, please wait a moment...',
          'loading', 'playgame-' + game.gameId);
        $rootScope.$apply();

        let fromIndex = position.toBackend[move.from];
        let toIndex = position.toBackend[move.to];
        /*
        console.log('fromIndex Frontend: ', move.from);
        console.log('toIndex Frontend: ', move.to);
        console.log('fromIndex Backend: ', fromIndex);
        console.log('toIndex Backend: ', toIndex);

        console.log('selfId: ', game.self.accountId);
        */
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

    $scope.gameTimeoutState = function () {
      let game = $scope.getGame();

      if(game) {
        return game.timeoutState;
      }
    };

    $scope.gameTimeoutReached = function () {
      let game = $scope.getGame();

      if(game && game.timeoutState !== 0) {
        console.log('gameTimeoutReached', game.timeoutStarted, new Date(game.timeoutStarted));
        return false;
      }
    };

    $scope.claimWin = function () {
      games.claimWin($scope.getGame());
    };

    $scope.offerDraw = function () {
      games.offerDraw($scope.getGame());
    };

    $scope.confirmGameEnded = function () {
      games.confirmGameEnded($scope.getGame());
    };

    $scope.claimTimeout = function () {
      games.claimTimeout($scope.getGame());
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

    //--- init Chessboard ---
    if (!$scope.isOpenGame()) {
      let game = $scope.getGame();
      if(game) {
        $(document).ready(function () {
          chess = new Chess();

          game = $scope.getGame();
          highlight = lightItUp();
          position = generateMapping();

          // set current fen
          try {
            gameState = SoliChess.getCurrentGameState(game.gameId, {from: game.self.accountId});
            currentFen = generateFen(gameState);

            generateState(currentFen);

            console.log('REAL FEN: ', chess.fen());
            console.log('GAMESTATE FEN: ', currentFen);
            console.log('GAMESTATE: ', gameState);
          } catch (e) {
            console.log(e);
          }

          board = new Chessboard('my-board', {
              position: currentFen,
              eventHandlers: {
                onPieceSelected: pieceSelected,
                onMove: pieceMove
              }
            }
          );

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


          SoliChess.Move(eventMove);
          SoliChess.GameTimeoutStarted(eventGameTimeoutStarted);
        }

        );
      }
      else {
        navigation.goto(navigation.welcomePage);
        $rootScope.$broadcast('message', 'No game with the specified id exists',
          'error', 'playgame');
      }
    }
  }
);
