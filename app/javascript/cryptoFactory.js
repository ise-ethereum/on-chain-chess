/* global angular */
var ethUtils = require('../../node_modules/ethereumjs-util/index');

import {web3, Auth} from '../../contract/Auth.sol';
angular.module('dappChess').factory('crypto', function () {
  let crypto = {};
  console.log('crypto loaded');
  console.log('Auth', Auth);

  /**
   * Calculates the signature of the given data.
   * @param{string} account to be used for signing
   * @param{object} data to be signed
   * @returns {string} the signature of the given data
   */
  crypto.sign = function (account, data) {
    let hash = web3.sha3(data);
    return web3.eth.sign(account, hash);
  };

  crypto.verify = function (account, signature, data) {
    let msgHash = web3.sha3(data);
    let r = signature.slice(0, 66);
    let s = '0x' + signature.slice(66, 130);
    let v = '0x' + signature.slice(130, 132);
    v = web3.toDecimal(v);

    console.log('r', r);
    console.log('s', s);
    console.log('v', v);
    console.log('msgHash', msgHash);
    console.log('Auth.verify', Auth.verify(msgHash, v, r, s));

    let signerAddress = ethUtils.ecrecover(new Buffer(msgHash, 'hex'), v, r, s);
    console.log('signerAddress', signerAddress.toString('hex'));
    console.log('account', account.slice(2));
    return account === signerAddress.toString('hex');
  };

  let text = 'My super text to be signed';
  let signature = crypto.sign(web3.eth.accounts[0], text);
  console.log('signature', signature);

  console.log('verify', crypto.verify(web3.eth.accounts[0], signature, text));

  return crypto;
});
