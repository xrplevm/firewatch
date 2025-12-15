// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./XChainUtils.sol";
import "./XChainTypes.sol";
import "./BridgeDoorCommon.sol";
import "./BridgeToken.sol";
import "./BridgeDoorCommon.sol";

abstract contract BridgeDoorToken is BridgeDoorCommon {
    // Analog of XChainCommit
    function commit(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address receiver,
        uint256 claimId,
        uint256 amount
    ) public payable virtual override whenNotPaused {
        emit Commit(getBridgeKey(bridgeConfig), claimId, msg.sender, amount, receiver);
        if (XChainUtils.isLockingChain(bridgeConfig, address(_safe))) {
            require(
                ERC20(getBridgeToken(bridgeConfig)).transferFrom(msg.sender, address(_safe), amount),
                "Failed to transfer locking token"
            );
        } else {
            BridgeToken(getBridgeToken(bridgeConfig)).burnFrom(msg.sender, amount);
        }
    }

    // Analog of XChainCommit without address
    function commitWithoutAddress(
        XChainTypes.BridgeConfig memory bridgeConfig,
        uint256 claimId,
        uint256 amount
    ) public payable virtual override whenNotPaused {
        emit CommitWithoutAddress(getBridgeKey(bridgeConfig), claimId, msg.sender, amount);
        if (XChainUtils.isLockingChain(bridgeConfig, address(_safe))) {
            require(
                ERC20(getBridgeToken(bridgeConfig)).transferFrom(msg.sender, address(_safe), amount),
                "Failed to transfer locking token"
            );
        } else {
            BridgeToken(getBridgeToken(bridgeConfig)).burnFrom(msg.sender, amount);
        }
    }

    function sendAssets(XChainTypes.BridgeConfig memory bridgeConfig, address destination, uint256 amount) internal virtual override {
        if (XChainUtils.isLockingChain(bridgeConfig, address(_safe))) {
            bytes memory data = abi.encodeWithSignature("transfer(address,uint256)", destination, amount);
            require(
                _safe.execTransactionFromModule(getBridgeToken(bridgeConfig), 0, data, Enum.Operation.Call),
                "Failed to send locking assets"
            );
        } else {
            bytes memory data = abi.encodeWithSignature("mint(address,uint256)", destination, amount);
            require(
                _safe.execTransactionFromModule(getBridgeToken(bridgeConfig), 0, data, Enum.Operation.Call),
                "Failed to send issuing assets"
            );
        }
    }
}
