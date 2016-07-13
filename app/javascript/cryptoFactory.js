/* global angular */
import {web3, Auth} from '../../contract/Auth.sol';
angular.module('dappChess').factory('crypto', function () {
  /*
   * Usage:
   * let text = 'My super text to be signed';
   * let signature = crypto.sign(web3.eth.accounts[0], gameId, text);
   * let valid = crypto.verify(web3.eth.accounts[0], gameId, signature, text);
   */

  let crypto = {};

  function leftPad (nr, n, str) {
    return Array(n - String(nr).length + 1).join(str || '0') + nr;
  }

  function solSha3 (...args) {
    args = args.map(arg => {
      if (typeof arg === 'string') {
        if (arg.substring(0, 2) === '0x') {
          return arg.slice(2);
        } else {
          return web3.toHex(arg).slice(2);
        }
      }

      if (typeof arg === 'number') {
        if (arg < 0) {
          return leftPad((arg >>> 0).toString(16), 64, 'F');
        }
        return leftPad((arg).toString(16), 64, 0);
      } else {
        return '';
      }
    });

    args = args.join('');

    return '0x' + web3.sha3(args, { encoding: 'hex' });
  }
  crypto.solSha3 = solSha3;

  /**
   * Calculates the signature of the given data.
   * @param{string} account to be used for signing
   * @param{string/number/array} data to be signed
   * @returns{string} the signature of the given data
   */
  crypto.sign = function (account, gameId, data=[]) {
    if (!Array.isArray(data)) data = [data];
    let hash = solSha3(...data, gameId);
    return web3.eth.sign(account, hash);
  };

  /**
   * Verifies the signature of the given data.
   * @param{string} account of the signature
   * @param{string} signature of the data
   * @param{string/number/array} data that was signed
   * @returns{boolean} true, iff the signature matches the account and data
     */
  crypto.verify = function (account, gameId, signature, data=[]) {
    if (!Array.isArray(data)) data = [data];
    let msgHash = solSha3(...data, gameId);
    let r = signature.slice(0, 66);
    let s = '0x' + signature.slice(66, 130);
    let v = '0x' + signature.slice(130, 132);
    console.log('crypto calling web3.toDecimal', v);
    v = web3.toDecimal(v);

    return Auth.verify(account, msgHash, v, r, s);
  };

  crypto.test = function () {
    const defaultBoard = [-4,-2,-3,-5,-6,-3,-2,-4,0,0,0,4,0,0,0,0,
                          -1,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,0,0,0,
                          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                          0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,
                          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                          1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
                          4,2,3,5,6,3,2,4,0,0,0,116,0,0,0,0];

    let text = 'My super text to be signed';
    let gameId = 0x529ae4d1feee4c1b4ae8194856bfec24ae7589bd2e31604d52a9019262b8d38e;

    let signature = crypto.sign(web3.eth.accounts[0], gameId, text);
    let valid = crypto.verify(web3.eth.accounts[0], gameId, signature, text);
    console.log('testing crypto.sign & crypo.verify: text \t\t\t==>', valid);

    signature = crypto.sign(web3.eth.accounts[0], gameId, defaultBoard);
    valid = crypto.verify(web3.eth.accounts[0], gameId, signature, defaultBoard);
    console.log('testing crypto.sign & crypo.verify: defaultBoard \t==>', valid);

    signature = crypto.sign(web3.eth.accounts[0], gameId, text);
    valid = Auth.verifySig(web3.eth.accounts[0], solSha3(text, gameId), signature);
    console.log('testing crypto.sign & Auth.verifySig: text \t\t\t==>', valid);

    signature = crypto.sign(web3.eth.accounts[0], gameId, defaultBoard);
    valid = Auth.verifySig(web3.eth.accounts[0], solSha3(...defaultBoard, gameId), signature);
    console.log('testing crypto.sign & Auth.verifySig: defaultBoard \t==>', valid);
  };

  //crypto.test();

  return crypto;
});
