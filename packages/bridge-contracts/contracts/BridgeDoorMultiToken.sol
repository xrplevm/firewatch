// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BridgeDoorCommon.sol";
import "./GnosisSafeL2.sol";
import "./XChainUtils.sol";
import "./BridgeDoorNative.sol";
import "./BridgeDoorToken.sol";

contract BridgeDoorMultiToken is BridgeDoorCommon, BridgeDoorNative, BridgeDoorToken {
    constructor(
        GnosisSafeL2 safe
    ) BridgeDoorCommon(safe) {}

    // Analog of XChainCommit
    function commit(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address receiver,
        uint256 claimId,
        uint256 amount
    ) public override(BridgeDoor, BridgeDoorNative, BridgeDoorToken) payable whenNotPaused {
        if (XChainUtils.isNative(bridgeConfig, address(_safe))) {
            BridgeDoorNative.commit(bridgeConfig, receiver, claimId, amount);
        } else {
            BridgeDoorToken.commit(bridgeConfig, receiver, claimId, amount);
        }
    }

    // Analog of XChainCommit without address
    function commitWithoutAddress(
        XChainTypes.BridgeConfig memory bridgeConfig,
        uint256 claimId,
        uint256 amount
    ) public override(BridgeDoor, BridgeDoorNative, BridgeDoorToken) payable whenNotPaused {
        if (XChainUtils.isNative(bridgeConfig, address(_safe))) {
            BridgeDoorNative.commitWithoutAddress(bridgeConfig, claimId, amount);
        } else {
            BridgeDoorToken.commitWithoutAddress(bridgeConfig, claimId, amount);
        }
    }

    // Analog of XChainCreateAccountCommit
    function createAccountCommit(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address destination,
        uint256 amount,
        uint256 signatureReward
    ) public override(BridgeDoor, BridgeDoorNative) payable whenNotPaused {
        if (XChainUtils.isNative(bridgeConfig, address(_safe))) {
            BridgeDoorNative.createAccountCommit(bridgeConfig, destination, amount, signatureReward);
        } else {
            revert("createAccountCommit: cannot create account with a token bridge");
        }
    }

    // Analog of XChainAddCreateAccountAttestation
    function addCreateAccountAttestation(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address destination,
        uint256 amount,
        uint256 signatureReward
    ) public override(BridgeDoor, BridgeDoorNative) onlyWitness whenNotPaused {
        if (XChainUtils.isNative(bridgeConfig, address(_safe))) {
            BridgeDoorNative.addCreateAccountAttestation(bridgeConfig, destination, amount, signatureReward);
        } else {
            revert("createAccountCommit: cannot attest account create on token bridge");
        }
    }

    function sendAssets(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address destination,
        uint256 amount
    ) internal override(BridgeDoor, BridgeDoorNative, BridgeDoorToken) {
        if (XChainUtils.isNative(bridgeConfig, address(_safe))) {
            BridgeDoorNative.sendAssets(bridgeConfig, destination, amount);
        } else {
            BridgeDoorToken.sendAssets(bridgeConfig, destination, amount);
        }
    }
}
