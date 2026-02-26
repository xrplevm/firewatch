// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BridgeDoor.sol";
import "./Utils.sol";

contract GnosisSafeL2Mock is GnosisSafeL2 {
    uint256 public immutable threshold;
    address[] public owners;

    event ExecTransactionFromModule(address to, uint256 value, bytes data, Enum.Operation operation);
    event ExecutionFromModuleSuccess(address indexed module);
    event ExecutionFromModuleFailure(address indexed module);
    event Received(address from, uint256 value);

    constructor(address[] memory owners_, uint256 threshold_) {
        owners = owners_;
        threshold = threshold_;
    }

    function execute(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256 txGas
    ) internal returns (bool success) {
        if (operation == Enum.Operation.DelegateCall) {
            // solhint-disable-next-line no-inline-assembly
            assembly {
                success := delegatecall(txGas, to, add(data, 0x20), mload(data), 0, 0)
            }
        } else {
            // solhint-disable-next-line no-inline-assembly
            assembly {
                success := call(txGas, to, value, add(data, 0x20), mload(data), 0, 0)
            }
        }
    }

    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation
    ) external override returns (bool success) {
        success = execute(to, value, data, operation, type(uint256).max);
        if (success) emit ExecutionFromModuleSuccess(msg.sender);
        else emit ExecutionFromModuleFailure(msg.sender);

        emit ExecTransactionFromModule(to, value, data, operation);
    }

    function getOwners() external view override returns (address[] memory) {
        return owners;
    }

    function getThreshold() external view override returns (uint256) {
        return threshold;
    }

    function isOwner(address owner) external view override returns (bool) {
        return Utils.containsAddress(owners, owner);
    }

    /// @dev Fallback function allows to deposit ether.
    receive() external payable {
        emit Received(tx.origin, msg.value);
    }
}
