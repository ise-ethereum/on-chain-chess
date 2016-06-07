/* global angular, Chess, Chessboard, ChessUtils */
import {Chess as SoliChess} from '../../contract/Chess.sol';
angular.module('dappChess').controller('PlayGameCtrl',
  function (games, $route, $scope, $rootScope) {
    // init chess validation
    var chess, board, position;

    function generateResults() {

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

    function checkOpenGame(gameId) {
      return games.openGames.indexOf(gameId) !== -1;
    }

    // Update game information to user
    function updateGameInfo(status) {
      $('#info-status').html(status);
      $('#info-fen').html(chess.fen());
      $('#info-pgn').html(chess.pgn());
    }

    function processChessMove(chessMove) {
      console.log('chessMove');

      let nextPlayer, status,
        game = $scope.getGame(),
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
      }
      updateGameInfo(status);
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
      let chessMove = null;
      try {
        $rootScope.$broadcast('message', 'Submitting your move, please wait a moment...',
          'loading', 'playgame-' + game.gameId);
        $rootScope.$apply();

        let fromIndex = position.toBackend[move.from];
        let toIndex = position.toBackend[move.to];
        console.log('fromIndex Frontend: ', move.from);
        console.log('toIndex Frontend: ', move.to);
        console.log('fromIndex Backend: ', fromIndex);
        console.log('toIndex Backend: ', toIndex);

        console.log('selfId: ', game.self.accountId);

        SoliChess.move(game.gameId, fromIndex, toIndex, {from: game.self.accountId});

        SoliChess.GameStateChanged({}, function (err, data) {
          console.log('Gamestate: ', data.args.state);
        });

        SoliChess.Move({}, function(err, data) {
          console.log('eventMove', err, data);
          if(err) {

          }
          else {
            // if valid: move chess piece from a to b
            // else: return null

            console.log(chess.fen());
            chessMove = chess.move({
              from: move.from,
              to: move.to,
              promotion: 'q'
            });

            console.log(chess.fen());
            board.move(move.from + '-' + move.to);
          }
        });

      } catch(e) {
        console.log(e);
        $rootScope.$broadcast('message', 'Could not validate your move',
          'error', 'playgame-' + game.gameId);
        $rootScope.$apply();
      }

      processChessMove(chessMove);

      return chess.fen();
    }

    // set all chess pieces in start position
    function resetGame(board) {
      console.log('resetGame', board);

      let game = $scope.getGame();
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
        Chess.surrender($scope.getGameId(), {from: $scope.getGame().self.accountId});
      }
      catch(e) {
        $rootScope.$broadcast('message', 'Could not submit your surrender', 'loading', 'playgame');
      }
    };

    $scope.gameIsWon = function() {
      let game = $scope.getGame();
      return typeof(game.winner) !== 'undefined' && game.winner === 'self';
    };

    $scope.gameIsLost = function() {
      let game = $scope.getGame();
      return typeof(game.winner) !== 'undefined' && game.winner === 'opponent';
    };

    $scope.gameIsActive = function() {
      return typeof($scope.getGame().winner) === 'undefined';
    };

    //--- init Chessboard ---
    if ($scope.isOpenGame !== false) {
      $(document).ready(function () {
        chess = new Chess();

        let game = $scope.getGame();

        board = new Chessboard('my-board', {
            position: ChessUtils.FEN.startId,
            eventHandlers: {
              onPieceSelected: pieceSelected,
              onMove: pieceMove
            }
          }
        );

        position = generateResults();

        // init game
        resetGame(board);




        // opponent starts game
        if (game.self.color === 'black') {
          board.setOrientation(ChessUtils.ORIENTATION.black);
          board.enableUserInput(false);
        }

      });
    }
  }
);
