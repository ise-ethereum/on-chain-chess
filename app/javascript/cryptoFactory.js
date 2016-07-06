/* global angular */
import {web3, Auth} from '../../contract/Auth.sol';
angular.module('dappChess').factory('crypto', function () {
  /*
   * Usage:
   * let text = 'My super text to be signed';
   * let signature = crypto.sign(web3.eth.accounts[0], text);
   * let valid = crypto.verify(web3.eth.accounts[0], signature, text);
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

  /**
   * Calculates the signature of the given data.
   * @param{string} account to be used for signing
   * @param{object} data to be signed
   * @returns{string} the signature of the given data
   */
  crypto.sign = function (account, data) {
    let hash = solSha3(data);
    return web3.eth.sign(account, hash);
  };

  /**
   * Verifies the signature of the given data.
   * @param{string} account of the signature
   * @param{string} signature of the data
   * @param{object} data that was signed
   * @returns{boolean} true, iff the signature matches the account and data
     */
  crypto.verify = function (account, signature, data) {
    let msgHash = solSha3(data);
    let r = signature.slice(0, 66);
    let s = '0x' + signature.slice(66, 130);
    let v = '0x' + signature.slice(130, 132);
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
    let object = { 'asd': 12, 32: '423' };

    let signature = crypto.sign(web3.eth.accounts[0], text);
    let valid = crypto.verify(web3.eth.accounts[0], signature, text);
    console.log('testing crypto.sign & crypo.verify: text \t\t\t==>', valid);

    signature = crypto.sign(web3.eth.accounts[0], object);
    valid = crypto.verify(web3.eth.accounts[0], signature, object);
    console.log('testing crypto.sign & crypo.verify: object \t\t\t==>', valid);

    signature = crypto.sign(web3.eth.accounts[0], defaultBoard);
    valid = crypto.verify(web3.eth.accounts[0], signature, defaultBoard);
    console.log('testing crypto.sign & crypo.verify: defaultBoard \t==>', valid);

    signature = crypto.sign(web3.eth.accounts[0], text);
    valid = Auth.verifySig(web3.eth.accounts[0], solSha3(text), signature);
    console.log('testing crypto.sign & Auth.verifySig: text \t\t\t==>', valid);

    signature = crypto.sign(web3.eth.accounts[0], object);
    valid = Auth.verifySig(web3.eth.accounts[0], solSha3(object), signature);
    console.log('testing crypto.sign & Auth.verifySig: object \t\t==>', valid);

    signature = crypto.sign(web3.eth.accounts[0], defaultBoard);
    valid = Auth.verifySig(web3.eth.accounts[0], solSha3(defaultBoard), signature);
    console.log('testing crypto.sign & Auth.verifySig: defaultBoard \t==>', valid);
  };

  // crypto.test();

  return crypto;
});
