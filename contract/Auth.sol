contract Auth {
    function verify( bytes32 hash, uint8 v, bytes32 r, bytes32 s) constant returns(address retAddr) {
        retAddr = ecrecover(hash, v, r, s);
    }
}
