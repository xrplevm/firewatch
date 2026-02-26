// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

library XChainTypes {
    struct AttestationClaimData {
        address destination;
        uint256 amount;
    }

    struct ClaimData {
        address creator;
        address sender; // address that will send the transaction on the other chain
        mapping(address => AttestationClaimData) attestations;
        bool exists;
    }

    struct CreateAccountData {
        uint256 signatureReward;
        mapping(address => uint256) attestations;
        bool isCreated;
        bool exists;
    }

    struct BridgeChainIssue {
        address issuer;
        string currency;
    }

    struct BridgeConfig {
        address lockingChainDoor;
        BridgeChainIssue lockingChainIssue;
        address issuingChainDoor;
        BridgeChainIssue issuingChainIssue;
    }

    struct BridgeParams {
        uint256 minCreateAmount;
        uint256 signatureReward;
    }

    struct XChainBridge {
        bool lock;
        BridgeParams params;
        BridgeConfig config;
        address tokenAddress;
        Counters.Counter claimsCounter;
        mapping(uint256 => XChainTypes.ClaimData) claims;
        mapping(address => XChainTypes.CreateAccountData) createAccounts;
    }
}
