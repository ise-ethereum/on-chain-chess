/* global angular */
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
  var init = function() {


    // init chess validation
    let chess = new Chess();

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

      updateGameInfo('Next player is white.');
    }

    resetGame();

    // Update game information to user
    function updateGameInfo(status) {
      $('#info-status').html(status);
      $('#info-fen').html(chess.fen());
      $('#info-pgn').html(chess.pgn());
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
      nextPlayer = 'white';
      if (chess.turn() === 'b') {
        nextPlayer = 'black';
      }

      // check situation
      if (chessMove !== null) {
        
        // game over?
        if (chess.in_checkmate() === true) {
          status = 'CHECKMATE! Player ' + nextPlayer + ' lost.';
        }
          
        // draw?
        else if (chess.in_draw() === true) {
          status = 'DRAW!';
        }
          
        // game is still on 
        else {
          status = 'Next player is ' + nextPlayer + '.';
          
          // plaver in check?
          if (chess.in_check() === true) {
            status = 'CHECK! ' + status;
            // ToDo: set 'danger' color for king 
            console.log('css')
          }
        }

        updateGameInfo(status);
      }

      return chess.fen();
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

  }; 
  $(document).ready(init);

});

