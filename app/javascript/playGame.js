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
        console.log(chessMove);

        // ToDo send information to server

        // define next player
        if (userColor === chess.turn()) {
          nextPlayer = game.opponent.name;
          chess.enableUserInput(false);
        } else {
          nextPlayer = game.self.name;
          chess.enableUserInput(true);
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
        board.enableUserInput(false);
      }


    });
  }


});

