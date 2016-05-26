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

  var init = function() {

//--- Chessboard ---

  let chess = new Chess();

  let myboard = new Chessboard('my-board', {
    position: ChessUtils.FEN.startId,
    eventHandlers: {
      onPieceSelected: pieceSelected,
      onMove: pieceMove
    }
  });

  resetGame();

  function resetGame() {
    myboard.setPosition(ChessUtils.FEN.startId);
    chess.reset();

    updateGameInfo('Next player is white.');
  }

  function updateGameInfo(status) {
    $('#info-status').html(status);
    $('#info-fen').html(chess.fen());
    $('#info-pgn').html(chess.pgn());
  }

  function pieceMove(move) {

    let nextPlayer,
      status,
      chessMove = chess.move({
        from: move.from,
        to: move.to,
        promotion: 'q'
      });
    console.log(chessMove);
    

    nextPlayer = 'white';
    if (chess.turn() === 'b') {
      nextPlayer = 'black';
    }

    if (chessMove !== null) {
      if (chess.in_checkmate() === true) {
        status = 'CHECKMATE! Player ' + nextPlayer + ' lost.';
      } else if (chess.in_draw() === true) {
        status = 'DRAW!';
      } else {
        status = 'Next player is ' + nextPlayer + '.';

        if (chess.in_check() === true) {
          status = 'CHECK! ' + status;
          console.log('css ändern')
        }
      }

      updateGameInfo(status);
    }

    return chess.fen();
  }

  function pieceSelected(notationSquare) {
    var i,
      movesNotation,
      movesPosition = [];
    console.log('haha');
    movesNotation = chess.moves({square: notationSquare, verbose: true});
    for (i = 0; i < movesNotation.length; i++) {
      movesPosition.push(ChessUtils.convertNotationSquareToIndex(movesNotation[i].to));
    }
    return movesPosition;
  }

  }; // end init()
  $(document).ready(init);

});

