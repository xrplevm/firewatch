// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./BridgeDoor.sol";
import "./GnosisSafeL2.sol";
import "./Manageable.sol";
import "./XChainBridgeStore.sol";
import "./BridgeToken.sol";
import "./XChainUtils.sol";

abstract contract BridgeDoorCommon is BridgeDoor {
    uint256 public constant MIN_CREATE_BRIDGE_REWARD = 25000000000000000000; // 25 ETH

    constructor(GnosisSafeL2 safe) {
        _safe = safe;
        transferOwnership(address(safe));
    }

    function createBridge(
        XChainTypes.BridgeConfig memory config,
        XChainTypes.BridgeParams memory params
    ) public override onlyOwner whenNotPaused {
        emit CreateBridge(
            getBridgeKey(config),
            config.lockingChainDoor,
            config.lockingChainIssue.issuer,
            config.lockingChainIssue.currency,
            config.issuingChainDoor,
            config.issuingChainIssue.issuer,
            config.issuingChainIssue.currency
        );
        XChainUtils.validateBridgeConfig(config, address(_safe));

        if (XChainUtils.isToken(config, address(_safe))) {
            require(params.minCreateAmount == 0, "minCreateAmount must be 0 for token bridges");

            if (XChainUtils.isLockingChain(config, address(_safe))) {
                storeBridge(config, params, config.lockingChainIssue.issuer);
            } else {
                string memory tokenName = string.concat(
                    "Bridged ",
                    Strings.toHexString(uint256(uint160(config.lockingChainIssue.issuer))),
                    " - ",
                    config.issuingChainIssue.currency
                );
                string memory tokenCode = string.concat(config.issuingChainIssue.currency);
                BridgeToken bridgeToken = new BridgeToken(tokenName, tokenCode);
                storeBridge(config, params, address(bridgeToken));
                bridgeToken.transferOwnership(address(_safe));
            }
        } else {
            require(params.minCreateAmount > 0, "minAccountCreateAmount must be greater than 0");
            storeBridge(config, params, address(0));
        }
    }

    function createBridgeRequest(address tokenAddress) public payable override whenNotPaused {
        emit CreateBridgeRequest(tokenAddress);

        require(msg.value >= MIN_CREATE_BRIDGE_REWARD, "Not enough reward");
        require(!isTokenRegistered(tokenAddress), "Token already registered");

        // Send reward to safe
        (bool sent, ) = address(_safe).call{value: msg.value}("");
        require(sent, "Failed to send create reward reward to safe vault");
    }

    /**
     * @dev Throws if called by any account not in the witness list
     */
    modifier onlyWitness() {
        require(_safe.isOwner(msg.sender), "caller is not a witness");
        _;
    }

    // Analog of XChainCreateClaimID
    function createClaimId(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address sender
    ) public payable override whenNotPaused returns (uint256) {
        (, uint256 signatureReward) = getBridgeParams(bridgeConfig);

        require(msg.value >= signatureReward, "createClaimId: amount sent is smaller than required signature reward");

        uint256 claimId = storeClaim(bridgeConfig, msg.sender, sender);

        emit CreateClaim(getBridgeKey(bridgeConfig), claimId, msg.sender, sender);

        // Send signature reward to safe
        (bool sent, ) = address(_safe).call{value: msg.value}("");
        require(sent, "Failed to send signature reward to safe vault");

        return claimId;
    }

    // Analog of XChainClaim
    function claim(
        XChainTypes.BridgeConfig memory bridgeConfig,
        uint256 claimId,
        uint256 amount,
        address destination
    ) public override whenNotPaused {
        address destinationAtt;
        uint256 amountAtt;
        address[] memory witnesses;
        XChainTypes.ClaimData storage claimData = _getBridgeClaim(bridgeConfig, claimId);
        require(claimData.exists, "Claim not found");
        require(msg.sender == claimData.creator, "Claim claimer has to be original creator");

        (destinationAtt, amountAtt, witnesses) = checkClaimAttestations(bridgeConfig, claimId, false);
        require(amountAtt == amount, "claim: attested amount different from claimed amount");

        emit Claim(getBridgeKey(bridgeConfig), claimId, msg.sender, amount, destination);

        if (destinationAtt == address(0)) {
            creditClaim(bridgeConfig, claimId, destination, amount, witnesses);
        }
    }

    // Analog of XChainAddAttestation
    function addClaimAttestation(
        XChainTypes.BridgeConfig memory bridgeConfig,
        uint256 claimId,
        uint256 amount,
        address sender,
        address destination
    ) public override onlyWitness whenNotPaused {
        XChainTypes.ClaimData storage claimData = _getBridgeClaim(bridgeConfig, claimId);
        require(claimData.exists, "Claim not found");
        require(sender == claimData.sender, "attestClaim: sender does not match");

        claimData.attestations[msg.sender].destination = destination;
        claimData.attestations[msg.sender].amount = amount;

        emit AddClaimAttestation(getBridgeKey(bridgeConfig), claimId, msg.sender, amount, destination);

        checkAndCreditClaim(bridgeConfig, claimId);
    }

    function checkAndCreditClaim(XChainTypes.BridgeConfig memory bridgeConfig, uint256 claimId) internal {
        address destination;
        uint256 amount;
        address[] memory witnesses;

        (destination, amount, witnesses) = checkClaimAttestations(bridgeConfig, claimId, true);
        if (destination == address(0)) {
            // If destination is address(0) do not credit, wait for claim
            return;
        }

        creditClaim(bridgeConfig, claimId, destination, amount, witnesses);
    }

    function checkClaimAttestations(
        XChainTypes.BridgeConfig memory bridgeConfig,
        uint256 claimId,
        bool justTry
    ) internal view returns (address, uint256, address[] memory) {
        XChainTypes.ClaimData storage claimData = _getBridgeClaim(bridgeConfig, claimId);
        require(claimData.exists, "Claim not found");

        address[] memory witnesses = getWitnesses();
        uint256 mostHitAmount = 0;
        uint256 mostHitTimes = 0;
        address mostHitDestination = address(0);

        // For every CURRENT witness check it's attestations made
        for (uint256 i = 0; i < witnesses.length; i++) {
            uint256 hitsForThisWitness = 0;
            address witness = witnesses[i];
            XChainTypes.AttestationClaimData memory attestation = claimData.attestations[witness];
            // If the witness has not made any attestation then continue
            if (attestation.amount == 0) continue;
            // Check other witnesses having the same attestation
            for (uint256 j = 0; j < witnesses.length; j++) {
                address comparingWitness = witnesses[j];

                XChainTypes.AttestationClaimData memory comparingAttestation = claimData.attestations[comparingWitness];
                // Attested the same amount
                if (comparingAttestation.amount == attestation.amount && attestation.destination == comparingAttestation.destination) {
                    hitsForThisWitness++;
                }
            }

            // If is the one with more hits, then is the winning result
            if (hitsForThisWitness > mostHitTimes) {
                mostHitTimes = hitsForThisWitness;
                mostHitAmount = attestation.amount;
                mostHitDestination = attestation.destination;
            }
        }

        // If we are just trying and there's not enough threshold return without throwing exception
        address[] memory witnessHits = new address[](mostHitTimes);
        if (justTry && mostHitTimes < _safe.getThreshold()) {
            return (address(0), 0, witnessHits);
        }

        // When enough attestations, not claimed and valid destination send amount
        require(mostHitTimes >= _safe.getThreshold() && mostHitAmount > 0, "Can not credit there is no consensus");

        uint256 currentWitnessHitsIndex = 0;
        for (uint256 i = 0; i < witnesses.length; i++) {
            XChainTypes.AttestationClaimData memory attestation = claimData.attestations[witnesses[i]];
            if (attestation.amount == mostHitAmount && attestation.destination == mostHitDestination) {
                witnessHits[currentWitnessHitsIndex] = witnesses[i];
                currentWitnessHitsIndex++;
            }
        }

        return (mostHitDestination, mostHitAmount, witnessHits);
    }

    function creditClaim(
        XChainTypes.BridgeConfig memory bridgeConfig,
        uint256 claimId,
        address destination,
        uint256 amount,
        address[] memory witnesses
    ) internal {
        deleteClaim(bridgeConfig, claimId);
        emit Credit(getBridgeKey(bridgeConfig), claimId, destination, amount);

        sendAssets(bridgeConfig, destination, amount);
        sendWitnessesReward(bridgeConfig, witnesses);
    }

    function sendWitnessesReward(XChainTypes.BridgeConfig memory bridgeConfig, address[] memory witnesses) internal {
        (, uint256 signatureReward) = getBridgeParams(bridgeConfig);
        // Integer division. If witnesses.length no divisable by reward some funds would be lost
        uint256 rewardAmount = signatureReward / witnesses.length;
        for (uint256 i = 0; i < witnesses.length; i++) {
            sendTransaction(payable(witnesses[i]), rewardAmount);
        }
    }

    function sendTransaction(address payable destination, uint256 value) internal override {
        bool sent = _safe.execTransactionFromModule(destination, value, "", Enum.Operation.Call);
        require(sent, "Failed to send Transaction");
    }

    function getWitnesses() public view override returns (address[] memory) {
        return _safe.getOwners();
    }
}
