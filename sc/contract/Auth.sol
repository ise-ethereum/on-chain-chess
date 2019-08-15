contract Auth {


    // Written by Alex Beregszaszi (@axic), use it under the terms of the MIT license.
    // slightly modified
    function verifySig(address account, bytes32 hash, bytes sig) constant returns (bool) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        if (sig.length != 65){
          return false;
      		//throw;
      	}

        // The signature format is a compact form of:
        //   {bytes32 r}{bytes32 s}{uint8 v}
        // Compact means, uint8 is not padded to 32 bytes.
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            // Here we are loading the last 32 bytes, including 31 bytes
            // of 's'. There is no 'mload8' to do this.
            //
            // 'byte' is not working due to the Solidity parser, so lets
            // use the second best option, 'and'
            v := and(mload(add(sig, 65)), 255)
        }

        // old geth sends a `v` value of [0,1], while the new, in line with the YP sends [27,28]
        if (v < 27)
          v += 27;

        return verify(account, hash, v, r, s);
    }


    function getAddress(bytes32 hash, uint8 v, bytes32 r, bytes32 s) constant returns(address) {
        return ecrecover(hash, v, r, s);
    }

    function verify(address account, bytes32 hash, uint8 v, bytes32 r, bytes32 s) constant returns(bool) {
        return account == getAddress(hash, v, r, s);
    }
}
