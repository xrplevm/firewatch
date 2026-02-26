// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./GnosisSafeL2.sol";
import "./XChainTypes.sol";
import "./GnosisSafeL2.sol";
import "./Utils.sol";

library XChainUtilsUnsafe {
    function validateBridgeConfig(XChainTypes.BridgeConfig memory bridgeConfig, address safe) public view {
        bool isLockingBridge = bridgeConfig.lockingChainDoor == safe;
        bool isIssuingBridge = bridgeConfig.issuingChainDoor == safe;

        require(isLockingBridge || isIssuingBridge, "Invalid bridge config: Bridge is not lockingChain nor issuingChain");

        // Locking chain is Native (Native -> Native or Native -> Token)
        if (Utils.equal(bridgeConfig.lockingChainIssue.currency, "XRP")) {
            require(
                bridgeConfig.lockingChainIssue.issuer == address(0),
                "Invalid bridge config: Native locking bridge must have lockingChainIssue.issuer set to address(0)"
            );

            // Issuing chain is Native (Native -> Native)
            if (Utils.equal(bridgeConfig.issuingChainIssue.currency, "XRP")) {
                require(
                    bridgeConfig.issuingChainIssue.issuer == address(0),
                    "Invalid bridge config: Native issuing bridge must have issuingChainIssue.issuer set to address(0)"
                );
                // require(
                //     bridgeConfig.issuingChainDoor == 0xB5f762798A53d543a014CAf8b297CFF8F2F937e8,
                //     "Invalid bridge config: Native issuing bridge door account must be 0xB5f762798A53d543a014CAf8b297CFF8F2F937e8"
                // );
            }
            // Issuing chain is Token (Native -> Token)
            else {
                require(
                    bridgeConfig.issuingChainDoor == bridgeConfig.issuingChainIssue.issuer,
                    "Invalid bridge config: Token bridge issuingChainDoor must be equal to issuingChainIssue.issuer"
                );
            }
        }
        // Locking chain is Token (Token -> Token)
        else {
            // TODO: Is this correct?
            require(
                bridgeConfig.lockingChainIssue.issuer != bridgeConfig.lockingChainDoor,
                "Invalid bridge config: lockingChainIssue.issuer must be different than lockingChainDoor"
            );
            require(
                !Utils.equal(bridgeConfig.issuingChainIssue.currency, "XRP"),
                "Invalid bridge config: Issuing chain issue can't be Native if locking chain is Token"
            );
            require(
                bridgeConfig.issuingChainDoor == bridgeConfig.issuingChainIssue.issuer,
                "Invalid bridge config: Token bridge issuingChainDoor must be equal to issuingChainIssue.issuer"
            );

            if (isLockingBridge) {
                require(
                    Utils.equal(ERC20(bridgeConfig.lockingChainIssue.issuer).symbol(), bridgeConfig.lockingChainIssue.currency),
                    "Invalid bridge config: Token bridge lockingChainIssue.currency must be the same as the ERC20 symbol"
                );
            } else {
                // TODO: Issuing chain bridges issuingChainIssue.issuer is not an ERC20
                // require(
                //  ERC20(bridgeConfig.issuingChainIssue.issuer).name() == bridgeConfig.issuingChainIssue.currency,
                //  "Invalid bridge config: Token bridge issuingChainIssue.currency must be the same as the ERC20 name"
                // );
            }
        }
    }

    function isLockingChain(XChainTypes.BridgeConfig memory bridgeConfig, address safe) public pure returns (bool) {
        return safe == bridgeConfig.lockingChainDoor;
    }

    function isIssuingChain(XChainTypes.BridgeConfig memory bridgeConfig, address safe) public pure returns (bool) {
        return !isLockingChain(bridgeConfig, safe);
    }

    function isNative(XChainTypes.BridgeConfig memory bridgeConfig, address safe) public pure returns (bool) {
        if (isLockingChain(bridgeConfig, safe)) return Utils.equal(bridgeConfig.lockingChainIssue.currency, "XRP");
        else return Utils.equal(bridgeConfig.issuingChainIssue.currency, "XRP");
    }

    function isToken(XChainTypes.BridgeConfig memory bridgeConfig, address safe) public pure returns (bool) {
        return !isNative(bridgeConfig, safe);
    }
}
