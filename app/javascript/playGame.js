/* global angular, Chess, Chessboard, ChessUtils */
import {Chess as SoliChess} from '../../contract/Chess.sol';

var module = angular.module('dappChess');
module.controller('PlayGameCtrl',
  function (games, $route, navigation, $scope, $rootScope) {
    // init chess validation
    var chess, board, lastFrom, lastTo, chessMove;
    // var highlight, currentFen, gamestate

    $scope.gamePgn = '';
    $scope.gameStatus = '';

    function generateMapping () {
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

    // Not used now, but will be used by gameStatesFactory later
    function generateState(fen) { // jshint ignore:line
      let fenComponents = fen.split(' ');
      let board = fenComponents[0],
          activeColor = fenComponents[1],
          castling =  fenComponents[2],
          enPassant =  fenComponents[3],
          halfMoveClock = fenComponents[4], // jshint ignore:line
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
            if (board[i] === 'K') {
              blackKing = counter;
            }
            if (board[i] === 'k') {
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
      state[77] = mapping.toBackend[enPassant];

      return state;
    }

    function generateFen(state) {
      let skip = 0, fen = '', zero = 0, toPiece = generatePieceMapping();

      for (var i = 0; i < state.length; i++) {

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
    }

    function lightItUp () {
      var xWhite = 0, yWhite = 8;
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

    function eventGameTimeoutStarted(err, data) {
      console.log('eventTimeoutStarted ', err, data);
      if (err) {
        console.log('EVENTGAMETIMEOUTERROR: ', err);
      } else {
        let game = $scope.getGame();

        /*
         Situation:
         - Black/White makes a move and sends offerDraw/claimWin. White/Black is in turn now.
         - White/Black must verify the situation.
         - Possible situation for white/black: checkmate, stalemate and draw
         - Possible answer from blockchain:
         - data.args.timeoutState === 1  -> checkmate
         - data.args.timeoutState === 0  -> nothing
         - data.args.timeoutState === -1 -> draw
         */
        if ((chess.turn() === 'w' && game.self.color === 'white' && data.args.timeoutState !== 0) ||
          (chess.turn() === 'b' && game.self.color === 'black' && data.args.timeoutState !== 0)) {

          // is checkmate for black
          if (chess.in_checkmate() && data.args.timeoutState === 1) {  // jshint ignore:line
            try {
              SoliChess.confirmGameEnded(game.gameId, {from: game.self.accountId});
            } catch (e) {
              $rootScope.$broadcast('message',
                'Could not confirm your game against ' + game.opponent.username + ' ended',
                'error', 'playgame-' + game.gameId);
              console.log('error while trying to confirm the game ended after checkmate', e);
            }
          }
          // is stalemate
          else if (chess.in_stalemate() && data.args.timeoutState === -1) {  // jshint ignore:line
            try {
              SoliChess.confirmGameEnded(game.gameId, {from: game.self.accountId});
            } catch (e) {
              $rootScope.$broadcast('message',
                'Could not confirm your game against ' + game.opponent.username + ' ended',
                'error', 'playgame-' + game.gameId);
              console.log('error while trying to confirm the game ended after stalemate', e);
            }
          }
          // is draw
          else if (chess.in_draw() && data.args.timeoutState === -1) {  // jshint ignore:line
            try {
              SoliChess.confirmGameEnded(game.gameId, {from: game.self.accountId});
            } catch (e) {
              $rootScope.$broadcast('message',
                'Could not confirm your game against ' + game.opponent.username + ' ended',
                'error', 'playgame-' + game.gameId);
              console.log('error while trying to confirm the game ended after draw', e);
            }
          } else {
            // hmmmmm...
          }

          $rootScope.$apply();
        }
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

    function processChessMoveOffChain(chessMove) {

      board.enableUserInput(!board.isUserInputEnabled());

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
          status = 'It\'s your turn.';
        } else {
          nextPlayer = game.opponent.username;
          status = 'It\'s ' + nextPlayer + '\'s turn.';
        }

        /*
         Situation: - Black/White makes a move. White/Black is in turn now.
         - Black/White checks checkmate, draw and stalemate conditions
         - If one of these conditions is true Black/White informs blockchain
         about the situation.
         - Note: only the player before will inform blockchain
         */
        if (chess.in_checkmate() === true) { // jshint ignore:line
          status = 'CHECKMATE! ' + nextPlayer + ' lost.';
          if (chess.turn() === 'b' && game.self.color === 'white') {
            games.claimWin(game);
          }
          if (chess.turn() === 'w' && game.self.color === 'black') {
            games.claimWin(game);
          }

        }
        // draw?
        else if (chess.in_draw() === true) { // jshint ignore:line
          status = 'DRAW!';
          if (chess.turn() === 'b' && game.self.color === 'white') {
            games.offerDraw(game);
          }
          if (chess.turn() === 'w' && game.self.color === 'black') {
            games.offerDraw(game);
          }
        }

        // stalemate?
        else if (chess.in_stalemate() === true) { // jshint ignore:line
          status = 'STALEMATE!';
          if (chess.turn() === 'b' && game.self.color === 'white') {
            games.offerDraw(game);
          }
          if (chess.turn() === 'w' && game.self.color === 'black') {
            games.offerDraw(game);
          }
        }

        // plaver in check?
        else if (chess.in_check() === true) { // jshint ignore:line
          status =  'CHECK! ' + status;
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

      var fen = chess.fen();

      if (chessMove !== null) {
        // Submit move off-chain
        game.state = generateState(fen);
        games.sendMove(game, move.from, move.to);
        processChessMoveOffChain(chessMove);
        $scope.$apply();
      } else {
        // Invalid move
      }

      return chess.fen();
    }

    let listenForMoves = function() {

      let game = $scope.getGame();
      games.listenForMoves(game, function(m) {

        let [msgType, state, stateSignature, fromIndex, toIndex, moveSignature] = m.payload; // jshint ignore:line

        let opponentChessMove = chess.move({
          from: fromIndex,
          to: toIndex,
          promotion: 'q'
        });

        if (opponentChessMove !== null) {
          board.move(fromIndex+ '-' + toIndex);
          games.sendAck(game);
          processChessMoveOffChain(opponentChessMove);
          $scope.$apply();
        } else {
          // ToDo: Move is not valid, send last state and move to blockchain
          console.log('Move is not valid, send last state and move to blockchain');
        }

      });

    };

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
    $scope.game = $scope.getGame();

    $scope.surrender = function() {
      $rootScope.$broadcast('message', 'Submitting your surrender, please wait...',
        'loading', 'playgame');
      try {
        SoliChess.surrender($scope.getGameId(), {from: $scope.getGame().self.accountId});
      }
      catch(e) {
        $rootScope.$broadcast('message', 'Could not submit your surrender',
          'error', 'playgame-' + $scope.getGameId());
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

    $scope.gameIsDraw = function () {
      let game = $scope.getGame();
      if(game) {
        return game.ended && (typeof(game.winner) === 'undefined' ||
          (game.winner !== 'self' && game.winner !== 'opponent'));
      }

      return false;
    };

    $scope.gameIsActive = function () {
      let game = $scope.getGame();

      if (game) {
        return !game.ended;
      }

      return false;
    };

    $scope.gameCanClaimWin = function () {
      let game = $scope.getGame();
      if (game) {
        return game.timeoutState === 0 &&
          game.nextPlayer !== game.self.accountId &&
          typeof game.nextPlayer !== 'undefined' &&
          chess.in_check() && // jshint ignore:line
          !game.ended;
      }
    };

    $scope.gameCanOfferDraw = function () {
      let game = $scope.getGame();
      if (game) {
        let timeoutDatePlus2TurnTime =
          new Date(game.timeoutStarted * 1000 + 2 * game.turnTime * 60000);
        return (game.timeoutState === 0 ||
          (game.timeoutState === 2 && timeoutDatePlus2TurnTime < new Date())) &&
          !game.ended;
      }
    };

    $scope.gameCanClaimTimeout = function () {
      let game = $scope.getGame();
      if (game) {
        return game.timeoutState === 0 &&
          game.nextPlayer !== game.self.accountId &&
          typeof game.nextPlayer !== 'undefined' &&
          !game.ended;
      }
    };

    $scope.gameCanConfirmDraw = function () {
      let game = $scope.getGame();
      if (game) {
        return (
            (game.timeoutState === -1 && game.nextPlayer === game.self.accountId) ||
            (game.timeoutState === -2 && game.nextPlayer !== game.self.accountId &&
              typeof game.nextPlayer !== 'undefined')
          ) && !game.ended;
      }
    };

    $scope.gameCanConfirmLoose = function () {
      let game = $scope.getGame();
      if (game) {
        return (game.timeoutState === 1 || game.timeoutState === 2) &&
          game.nextPlayer === game.self.accountId &&
          !game.ended;
      }
    };

    $scope.gameCanClaimTimeoutEnded = function () {
      let game = $scope.getGame();
      if (game && game.timeoutState !== 0) {
        let timeoutDatePlusTurnTime = new Date(game.timeoutStarted * 1000 + game.turnTime * 60000);
        // TODO show button dynamically, i think now it is only shown after reload when time greater
        // 10 minutes
        return game.timeoutState !== 0 &&
            game.nextPlayer !== game.self.accountId &&
            timeoutDatePlusTurnTime < new Date() &&
            !game.ended;
      }
    };

    $scope.claimWin = function () {
      games.claimWin($scope.getGame());
    };

    $scope.offerDraw = function () {
      games.offerDraw($scope.getGame());
    };

    $scope.claimTimeout = function () {
      games.claimTimeout($scope.getGame());
    };

    $scope.confirmGameEnded = function () {
      games.confirmGameEnded($scope.getGame());
    };

    $scope.claimTimeoutEnded = function () {
      games.claimTimeoutEnded($scope.getGame());
    };

    $scope.gameHasClaimableEther = function () {
      let game = $scope.getGame();

      if (game) {
        return game.self.wonEther > 0;
      }

      return false;
    };

    $scope.claimEther = function () {
      games.claimEther($scope.getGame());
    };

    $scope.closeGame = function () {
      SoliChess.closePlayerGame($scope.getGameId(), {from: $scope.getGame().self.accountId});
      $rootScope.$broadcast('message', 'Closing your game, please wait...',
        'loading', 'playgame');
    };



    let initGameOffChain = function(game) {
      // init chess.js and chessboard.js

      // set current fen
      let currentFen;
      try {
        let gameState = SoliChess.getCurrentGameState(game.gameId, {from: game.self.accountId});
        currentFen = generateFen(gameState);
      } catch (e) {
        console.log('error while trying to init game', e);
      }

      chess = new Chess(currentFen);
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

      SoliChess.GameTimeoutStarted(eventGameTimeoutStarted);
    };

    //--- init Chessboard ---
    if (!$scope.isOpenGame()) {
      let game = $scope.getGame();

      if(game) {
        $(document).ready(function () {
          listenForMoves();
          initGameOffChain(game);
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

module.directive('countdown', ['$interval', function($interval){
  return {
    scope: { 'to': '=countdown' },
    template: '{{timeLeft}}',
    link: function(scope){
      scope.timeLeft = '';

      function update() {
        var diff = scope.to.getTime() - new Date().getTime();
        var minutes = ('00' + Math.floor(diff/60000)).substr(-2);
        var seconds = ('00' + Math.floor((diff%60000)/1000)).substr(-2);
        scope.timeLeft = minutes + ':' + seconds + ' left';
      }

      var interval;
      function init() {
        if (typeof scope.to === 'undefined' || !scope.to) {
          if (typeof interval !== 'undefined') {
            interval.cancel();
            scope.timeLeft = '';
          }
          return;
        }
        console.log('Initialized countdown to', scope.to);
        interval = $interval(update, 1000);
      }

      scope.$watch('to', function() {
          init();
      });
      init();
    }
  };
}]);
