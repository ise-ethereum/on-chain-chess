import { tokenRecipient, MyToken, web3 } from '../contract/MyToken.sol';

var assert = require('chai').assert;

describe('MyToken', function() {
  describe('totalSupply()', function () {
    it('should return 500000', function () {
      assert.equal(MyToken.totalSupply(), 500000);
    });
  });
});
