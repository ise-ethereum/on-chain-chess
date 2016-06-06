/* global angular, Chess, Chessboard, ChessUtils */
import {web3, Chess as SoliChess} from '../../contract/Chess.sol';

angular.module('dappChess').controller('PlayGameCtrl', function (games, $route, $scope) {

  function checkOpenGame(gameId) {
    return games.openGames.indexOf(gameId) !== -1;
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

  function toHex(str) {
    var hex = '';
    for(var i=0;i<str.length;i++) {
      hex += ''+str.charCodeAt(i).toString(16);
    }
    return hex;
  }

  var states = {
    '-6': 'bK',
    '-5': 'bQ',
    '-4': 'bR',
    '-3': 'bB',
    '-2': 'bN',
    '-1': 'bP',
    '1' : 'wP',
    '2' : 'wN',
    '3' : 'wB',
    '4' : 'wR',
    '5' : 'wQ',
    '6' : 'wK'
  };


  function toFen(array) {
    var z = 0;
    for (var i = 0; i < array.length; i++){

      console.log(i);
      z++;
      
      // skip 8
      if (z === 8){
        i += 8;
        z = 0;
      }
    }
  };

  //--- init Chessboard ---
  if ($scope.isOpenGame !== false) {
    $(document).ready(function () {

      // get information
      let game = $scope.getGame();
      let userColor;
      if (game.self.color === 'white') {
        userColor = 'w';
      } else {
        userColor = 'b';
      }

      // init chess validation
      let chess = new Chess();

      // Update game information to user
      function updateGameInfo(status) {
        $('#info-status').html(status);
        $('#info-fen').html(chess.fen());
        $('#info-pgn').html(chess.pgn());
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

        let nextPlayer, status;

        // if valid: move chess piece from a to b
        // else: return null
        let chessMove = chess.move({
          from: move.from,
          to: move.to,
          promotion: 'q'
        });
        console.log(chessMove.from);
        console.log(chessMove.to);


        console.log(game.self.accountId);
        console.log(game.gameId);
        // ToDo send information to server
        console.log(web3.eth.accounts);

        try {
          SoliChess.move(game.gameId, toHex('96'), toHex('80'), {from: game.self.accountId});
        } catch(e) {
          console.log(e);
        }



        // define next player
        if (userColor === chess.turn()) {
          nextPlayer = game.self.username;

          //chess.enableUserInput(false);
        } else {
          nextPlayer = game.opponent.username;
          //chess.enableUserInput(true);
        }

        // check situation
        if (chessMove !== null) {

          // game over?
          if (chess.in_checkmate() === true) { // jshint ignore:line
            status = 'CHECKMATE! ' + nextPlayer + ' lost.';
          }

          // draw?
          else if (chess.in_draw() === true) { // jshint ignore:line
            status = 'DRAW!';
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

          updateGameInfo(status);
        }

        return chess.fen();
      }

      // init chessboard

      let board = new Chessboard('my-board', {
        position: ChessUtils.FEN.startId,
        eventHandlers: {
          onPieceSelected: pieceSelected,
          onMove: pieceMove
        }
      });

      // set all chess pieces in start position
      function resetGame() {
        board.setPosition(ChessUtils.FEN.startId);
        chess.reset();

       let gamer;
       if (game.self.color === 'white') {
       gamer = game.self.username;
       } else {
       gamer = game.opponent.username;
       }

        updateGameInfo('Next player is ' + gamer + '.' );
      }

      // init game
      resetGame();

      // opponent starts game
      if (game.self.color === 'black') {
        board.setOrientation(ChessUtils.ORIENTATION.black);
        //board.enableUserInput(false);
      }


    });
  }


});

