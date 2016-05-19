/* global angular inArray */
import { web3, Chess } from '../../contract/Chess.sol';
angular.module('dappChess').factory('games', function () {
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
      // TODO
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
    }
    
    console.log(games.list);
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
