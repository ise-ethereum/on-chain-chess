/* global angular inArray */
import { web3, Chess } from '../../contract/Chess.sol';
angular.module('dappChess').factory('games', function ($rootScope) {
  let games = {list: []};
  // mock
  games.list = [
    {
      self: {
        username: 'chessmouse72',
        accountId: web3.eth.accounts[0],
        color: 'white'
      },
      opponent: {
        username: 'mops23',
        accountId: '0x567890',
        color: 'black'
      },
      gameid: '123456789'
    },
    {
      self: {
        username: 'chessmouse72',
        accountId: web3.eth.accounts[0],
        color: 'black'
      },
      opponent: {
        username: 'mickey53',
        accountId: '0x67890',
        color: 'white'
      },
      gameid: '987654321'
    }
  ];
  games.initializeGameEvent = function (err, data) {
    console.log('initializeGameEvent', err, data);
    if (err) {
      $rootScope.$broadcast('message',
        'Your game could not be created, the following error occures: ' + err,
        'error', 'startgame');
    }
    else {
      var gameid = data.args.gameId;
      var accountId = data.args.player1;
      var username = data.args.player1Alias;
      var color = 'white';

      games.list.push({
        self: {
          username: username,
          accountId: accountId,
          color: color
        },
        gameid: gameid
      });
      
      $rootScope.$broadcast('message',
        'Your game has successfully been created and has the id ' + gameid,
        'success', 'startgame');
      
      $rootScope.$apply();
    }
  };
  Chess.GameInitialized({}, games.initializeGameEvent);
  return games;
}).filter('ownGames', function() {
  return function(games) {
    return games.filter(function (game) {
      return inArray(game.self.accountId, web3.eth.accounts);
    });
  }
});
