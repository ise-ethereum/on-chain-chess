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

  /**
   * Calculates the signature of the given data.
   * @param{string} account to be used for signing
   * @param{object} data to be signed
   * @returns{string} the signature of the given data
   */
  crypto.sign = function (account, data) {
    let hash = web3.sha3(data);
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
    let msgHash = '0x' + web3.sha3(data);
    let r = signature.slice(0, 66);
    let s = '0x' + signature.slice(66, 130);
    let v = '0x' + signature.slice(130, 132);
    v = web3.toDecimal(v);

    return Auth.verify(account, msgHash, v, r, s);
  };

  return crypto;
});
