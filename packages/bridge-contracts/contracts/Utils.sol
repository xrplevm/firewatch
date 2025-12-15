// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library Utils {
    function containsAddress(address[] memory array, address value) public pure returns (bool) {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == value) {
                return true;
            }
        }
        return false;
    }

    function equal(string memory a, string memory b) public pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
