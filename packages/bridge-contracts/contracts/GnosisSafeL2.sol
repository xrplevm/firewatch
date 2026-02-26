// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Enum {
    enum Operation {
        Call,
        DelegateCall
    }
}

interface GnosisSafeL2 {
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation
    ) external returns (bool success);

    function getOwners() external view returns (address[] memory);

    function getThreshold() external view returns (uint256);

    function isOwner(address owner) external view returns (bool);
}
