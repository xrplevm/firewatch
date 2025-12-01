// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./XChainTypes.sol";
import "./BridgeDoorCommon.sol";
import "./GnosisSafeL2.sol";

abstract contract BridgeDoorNative is BridgeDoorCommon {
    // Analog of XChainCommit
    function commit(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address receiver,
        uint256 claimId,
        uint256 amount
    ) public payable virtual override whenNotPaused {
        if (msg.value > 0) {
            require(msg.value >= amount, "Sent amount must be at least equal to amount");
            emit Commit(getBridgeKey(bridgeConfig), claimId, msg.sender, amount, receiver);
            (bool sent, ) = address(_safe).call{value: msg.value}("");
            require(sent, "Failed to send commit transaction to safe vault");
        }
    }

    // Analog of XChainCommit without address
    function commitWithoutAddress(
        XChainTypes.BridgeConfig memory bridgeConfig,
        uint256 claimId,
        uint256 amount
    ) public payable virtual override whenNotPaused {
        if (msg.value > 0) {
            require(msg.value >= amount, "Sent amount must be at least equal to amount");
            emit CommitWithoutAddress(getBridgeKey(bridgeConfig), claimId, msg.sender, amount);
            (bool sent, ) = address(_safe).call{value: msg.value}("");
            require(sent, "Failed to send commitWithoutAddress transaction to safe vault");
        }
    }

    // Analog of XChainCreateAccountCommit
    function createAccountCommit(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address destination,
        uint256 amount,
        uint256 signatureReward
    ) public payable virtual override whenNotPaused {
        (uint256 minCreateAmount, uint256 bridgeSignatureReward) = getBridgeParams(bridgeConfig);

        require(signatureReward >= bridgeSignatureReward, "createAccountCommit: amount sent is smaller than required signature reward");
        require(amount >= minCreateAmount, "createAccountCommit: amount sent is smaller than required minimum account create amount");
        require(msg.value >= signatureReward + amount, "createAccountCommit: not enough balance sent");

        emit CreateAccountCommit(getBridgeKey(bridgeConfig), msg.sender, destination, amount, signatureReward);

        (bool sent, ) = address(_safe).call{value: msg.value}("");
        require(sent, "Failed to send createAccountCommit transaction to safe vault");
    }

    // Analog of XChainAddAttestation
    function addCreateAccountAttestation(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address destination,
        uint256 amount,
        uint256 signatureReward
    ) public virtual override onlyWitness whenNotPaused {
        (uint256 minCreateAmount, ) = getBridgeParams(bridgeConfig);
        require(amount >= minCreateAmount, "attestCreateAccount: insufficient minimum amount sent");

        XChainTypes.CreateAccountData storage createAccountDataCheck = _getBridgeCreateAccount(bridgeConfig, destination);
        if (!createAccountDataCheck.exists) {
            storeCreateAccount(bridgeConfig, destination, signatureReward);
        }

        XChainTypes.CreateAccountData storage createAccountData = _getBridgeCreateAccount(bridgeConfig, destination);

        require(!createAccountData.isCreated, "attestCreateAccount: createAccountData is already created");

        createAccountData.attestations[msg.sender] = amount;

        emit AddCreateAccountAttestation(getBridgeKey(bridgeConfig), msg.sender, destination, amount);

        address[] memory witnesses = getWitnesses();
        uint256 mostHitAmount = 0;
        uint256 mostHitTimes = 0;

        // For every CURRENT witness check it's attestations made
        for (uint256 i = 0; i < witnesses.length; i++) {
            uint256 hitsForThisWitness = 0;
            address witness = witnesses[i];
            uint256 amountWitnessed = createAccountData.attestations[witness];
            // If the witness has not made any attestation then continue
            if (amountWitnessed == 0) continue;
            // Check other witnesses having the same attestation
            for (uint256 j = 0; j < witnesses.length; j++) {
                address comparingWitness = witnesses[j];

                uint256 comparingAmountWitnessed = createAccountData.attestations[comparingWitness];
                // Attested the same amount
                if (comparingAmountWitnessed == amountWitnessed) hitsForThisWitness++;
            }

            // If is the one with more hits, then is the winning result
            if (hitsForThisWitness > mostHitTimes) {
                mostHitTimes = hitsForThisWitness;
                mostHitAmount = amountWitnessed;
            }
        }

        // When enough attestations, not claimed and valid destination send amount
        if (mostHitTimes >= _safe.getThreshold() && mostHitAmount > 0) {
            address[] memory witnessHits = new address[](mostHitTimes);
            uint256 currentWitnessHitsIndex = 0;
            for (uint256 i = 0; i < witnesses.length; i++) {
                uint256 amountWitnessed = createAccountData.attestations[witnesses[i]];
                if (amountWitnessed == mostHitAmount) {
                    witnessHits[currentWitnessHitsIndex] = witnesses[i];
                    currentWitnessHitsIndex++;
                }
            }

            createAccountData.isCreated = true;
            createAccount(bridgeConfig, payable(destination), mostHitAmount, witnessHits);
        }
    }

    function sendAssets(XChainTypes.BridgeConfig memory, address destination, uint256 amount) internal virtual override {
        sendTransaction(payable(destination), amount);
    }

    function createAccount(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address payable destination,
        uint256 value,
        address[] memory witnesses
    ) private {
        emit CreateAccount(destination, value);
        sendTransaction(destination, value);
        sendWitnessesReward(bridgeConfig, witnesses);
    }
}
