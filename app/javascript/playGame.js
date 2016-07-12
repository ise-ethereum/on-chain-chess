/* global angular, Chessboard, ChessUtils */
import {Chess as SoliChess} from '../../contract/Chess.sol';
import {generateState, algebraicToIndex} from './utils/fen-conversion.js';

var module = angular.module('dappChess');
module.controller('PlayGameCtrl',
  function (games, gameStates, $route, navigation, $scope, $rootScope, $timeout) {
    // init chess validation
    var board, lastFrom, lastTo, chessMove;

    $scope.gamePgn = '';
    $scope.gameStatus = '';

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

      return {'playerWhite': playerWhite, 'playerBlack': playerBlack};
    }

    function checkOpenGame(gameId) {
      return games.openGames.indexOf(gameId) !== -1;
    }

    // Update game information to user
    function updateGameInfo(status) {
      $scope.gameStatus = status;
      $scope.gamePgn = $scope.game.chess.pgn();
      // Clean up Setup line
      $scope.gamePgn = $scope.gamePgn.replace(/\[SetUp "1"\]\n\[FEN "(.*?)"\]/, '$1');
    }

    // player clicked on chess piece
    function pieceSelected(notationSquare) {
      var i,
        movesNotation,
        movesPosition = [];

      movesNotation = $scope.game.chess.moves({square: notationSquare, verbose: true});
      for (i = 0; i < movesNotation.length; i++) {
        movesPosition.push(ChessUtils.convertNotationSquareToIndex(movesNotation[i].to));
      }
      return movesPosition;
    }


    function updateBoardState(game, chessMove = null) {
      let chess = game.chess;

      if (chessMove) {
        board.move(chessMove.from+ '-' + chessMove.to);

        // Of we know which move it was, show it on board
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
      }

      let nextPlayer, status,
        userColor = (game.self.color === 'white') ? 'w' :  'b';
      // define next player
      if (userColor === chess.turn()) {
        nextPlayer = 'You';
        status = 'It\'s your turn.';
        board.enableUserInput(true);
      } else {
        nextPlayer = game.opponent.username;
        status = 'It\'s ' + nextPlayer + '\'s turn.';
        board.enableUserInput(false);
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
        status = 'CHECK! ' + status;
      }
      updateGameInfo(status);
    }

    function pieceMoveOffChain(move) {
      let game = $scope.getGame();

      // move piece from ... to
      chessMove = game.chess.move({
        from: move.from,
        to: move.to,
        promotion: 'q'
      });

      let fen = game.chess.fen();

      if (chessMove !== null) {
        // Submit move off-chain
        game.state = generateState(fen);

        updateBoardState(game, chessMove);
        gameStates.addSelfMove(game.gameId,
                               algebraicToIndex(move.from),
                               algebraicToIndex(move.to),
                               game.state);
        // be sure to call sendMove after game updated!
        games.sendMove(game, move.from, move.to);
        $scope.$apply();
      } else {
        // Invalid move
      }

      return game.chess.fen();
    }

    function initChessboard(game) {
      board = new Chessboard('board-' + game.gameId, {
          position: game.chess.fen(),
          eventHandlers: {
            onPieceSelected: pieceSelected,
            onMove: pieceMoveOffChain
          }
        }
      );

      // set board orientation and disable black player to click
      if (game.self.color === 'black') {
        board.setOrientation(ChessUtils.ORIENTATION.black);
      }

      // Update game information
      if (game.ended) {
        updateGameInfo('Game ended.');
        board.enableUserInput(false);
      } else {
        if (game.chess.turn() === game.self.color[0]) {
          updateGameInfo('It\'s your turn.');
          board.enableUserInput(true);
        } else {
          updateGameInfo('It\'s your opponent\'s turn.');
          board.enableUserInput(false);
        }
      }
    }

    $scope.getGameId = function() {
      return $route.current.params.id;
    };

    $scope.isOpenGame = function() {
      let gameId = $scope.getGameId();

      if (gameId) {
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
      if (game && game.chess) {
        return game.timeoutState === 0 &&
          game.nextPlayer !== game.self.accountId &&
          typeof game.nextPlayer !== 'undefined' &&
          game.chess.in_check() && // jshint ignore:line
          !game.ended;
      }
      return false;
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

    $scope.game = $scope.getGame();

    // Keep track of currently viewing game
    games.viewingGame.id = $scope.game.gameId;
    $scope.$on('$destroy', function(){
        games.viewingGame.id = 0;
    });

    // Initialize chessboard
    if (!$scope.isOpenGame()) {
      if ($scope.game) {
        $timeout(() => {
          initChessboard($scope.game);
          updateBoardState($scope.game);
          $scope.$watch('game.lastMove', function(checkMove) {
            updateBoardState($scope.game, checkMove);
          });
        });
      } else {
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
        if (diff > 0) {
          var minutes = ('00' + Math.floor(diff/60000)).substr(-2);
          var seconds = ('00' + Math.floor((diff%60000)/1000)).substr(-2);
          scope.timeLeft = minutes + ':' + seconds + ' left';
        } else {
          scope.timeLeft = 'Time\'s up!';
        }
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
        interval = $interval(update, 1000);
      }

      scope.$watch('to', function() {
          init();
      });
      init();
    }
  };
}]);
