import { tokenRecipient, MyToken, web3 } from '../contract/MyToken.sol';

var assert = require('chai').assert;

describe('MyToken', function() {
  describe('totalSupply()', function () {
    it('should return 500000', function () {
      assert.equal(MyToken.totalSupply(), 500000);
    });
  });

  describe('transfer()', function () {
    it('should successfully transfer tokens', function () {
      const account1 = web3.eth.accounts[0];
      const account2 = web3.eth.accounts[1];
      MyToken.transfer(account2, 100, {from: account1, gas: 100000});

      assert.equal(MyToken.balanceOf(account2), 100);
      assert.equal(MyToken.balanceOf(account1), 500000 - 100);
    });
  });
});
