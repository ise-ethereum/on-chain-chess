contract Auth {
    function getAddress(bytes32 hash, uint8 v, bytes32 r, bytes32 s) constant returns(address retAddr) {
        retAddr = ecrecover(hash, v, r, s);
    }

    function verify(address account, bytes32 hash, uint8 v, bytes32 r, bytes32 s) constant returns(bool) {
        return account == getAddress(hash, v, r, s);
    }
}
