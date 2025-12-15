// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./GnosisSafeL2.sol";
import "./XChainTypes.sol";

abstract contract XChainBridgeStore {
    using Counters for Counters.Counter;
    mapping(bytes32 => XChainTypes.XChainBridge) private _bridges;
    bytes32[] private _bridgeKeys;

    function storeBridge(XChainTypes.BridgeConfig memory config, XChainTypes.BridgeParams memory params, address tokenAddress) internal {
        bytes32 bridgeKey = getBridgeKey(config);
        XChainTypes.XChainBridge storage actualBridge = _bridges[bridgeKey];
        require(!actualBridge.lock, "XChainBridge already registered");

        _bridges[bridgeKey].lock = true;
        _bridges[bridgeKey].params = params;
        _bridges[bridgeKey].config = config;
        _bridges[bridgeKey].tokenAddress = tokenAddress;

        _bridgeKeys.push(bridgeKey);
    }

    // XChainBridge stores
    function storeClaim(XChainTypes.BridgeConfig memory bridgeConfig, address creator, address sender) internal returns (uint256) {
        XChainTypes.XChainBridge storage bridge = getBridge(bridgeConfig);

        uint256 claimId = consumeClaimId(bridgeConfig);
        bridge.claims[claimId].creator = creator;
        bridge.claims[claimId].sender = sender;
        bridge.claims[claimId].exists = true;

        return claimId;
    }

    function deleteClaim(XChainTypes.BridgeConfig memory bridgeConfig, uint256 claimId) internal {
        _bridges[getBridgeKey(bridgeConfig)].claims[claimId].exists = false;
    }

    function storeCreateAccount(XChainTypes.BridgeConfig memory bridgeConfig, address account, uint256 signatureReward) internal {
        XChainTypes.XChainBridge storage bridge = getBridge(bridgeConfig);

        bridge.createAccounts[account].signatureReward = signatureReward;
        bridge.createAccounts[account].exists = true;
        bridge.createAccounts[account].isCreated = false;
    }

    function consumeClaimId(XChainTypes.BridgeConfig memory bridgeConfig) private returns (uint256) {
        XChainTypes.XChainBridge storage bridge = getBridge(bridgeConfig);
        bridge.claimsCounter.increment();
        return bridge.claimsCounter.current();
    }

    // XChainBridge getters
    function getBridge(XChainTypes.BridgeConfig memory bridgeConfig) internal view returns (XChainTypes.XChainBridge storage) {
        XChainTypes.XChainBridge storage bridge = _bridges[getBridgeKey(bridgeConfig)];
        require(bridge.lock, "XChainBridge not found");
        return bridge;
    }

    function _getBridgeClaim(
        XChainTypes.BridgeConfig memory bridgeConfig,
        uint256 claimId
    ) internal view returns (XChainTypes.ClaimData storage) {
        XChainTypes.XChainBridge storage bridge = getBridge(bridgeConfig);
        XChainTypes.ClaimData storage claimData = bridge.claims[claimId];
        require(claimData.exists, "Claim not found");
        return claimData;
    }

    function getBridgeClaim(XChainTypes.BridgeConfig memory bridgeConfig, uint256 claimId) public view returns (address, address, bool) {
        XChainTypes.XChainBridge storage bridge = getBridge(bridgeConfig);
        XChainTypes.ClaimData storage claimData = bridge.claims[claimId];
        return (claimData.creator, claimData.sender, claimData.exists);
    }

    function _getBridgeCreateAccount(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address account
    ) internal view returns (XChainTypes.CreateAccountData storage) {
        XChainTypes.XChainBridge storage bridge = getBridge(bridgeConfig);
        XChainTypes.CreateAccountData storage createAccountData = bridge.createAccounts[account];
        return createAccountData;
    }

    function getBridgeCreateAccount(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address account
    ) public view returns (uint256, bool, bool) {
        XChainTypes.XChainBridge storage bridge = getBridge(bridgeConfig);
        XChainTypes.CreateAccountData storage createAccountData = bridge.createAccounts[account];
        return (createAccountData.signatureReward, createAccountData.isCreated, createAccountData.exists);
    }

    function getBridgeToken(XChainTypes.BridgeConfig memory bridgeConfig) public view returns (address) {
        XChainTypes.XChainBridge storage bridge = getBridge(bridgeConfig);
        require(bridge.tokenAddress != address(0), "Bridge token is not defined");
        return bridge.tokenAddress;
    }

    function getBridgeParams(XChainTypes.BridgeConfig memory bridgeConfig) public view returns (uint256, uint256) {
        XChainTypes.XChainBridge storage bridge = getBridge(bridgeConfig);
        return (bridge.params.minCreateAmount, bridge.params.signatureReward);
    }

    function getBridgeConfig(
        XChainTypes.BridgeConfig memory bridgeConfig
    ) public view returns (address, address, string memory, address, address, string memory) {
        XChainTypes.XChainBridge storage bridge = getBridge(bridgeConfig);
        return (
            bridge.config.lockingChainDoor,
            bridge.config.lockingChainIssue.issuer,
            bridge.config.lockingChainIssue.currency,
            bridge.config.issuingChainDoor,
            bridge.config.issuingChainIssue.issuer,
            bridge.config.issuingChainIssue.currency
        );
    }

    function getBridgeKey(XChainTypes.BridgeConfig memory bridgeConfig) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    bridgeConfig.lockingChainDoor,
                    bridgeConfig.lockingChainIssue.issuer,
                    bridgeConfig.lockingChainIssue.currency,
                    bridgeConfig.issuingChainDoor,
                    bridgeConfig.issuingChainIssue.issuer,
                    bridgeConfig.issuingChainIssue.currency
                )
            );
    }

    function getBridgesPaginated(
        uint256 page
    ) public view returns (XChainTypes.BridgeConfig[] memory configs, XChainTypes.BridgeParams[] memory params) {
        uint256 pageSize = 10;
        configs = new XChainTypes.BridgeConfig[](pageSize);
        params = new XChainTypes.BridgeParams[](pageSize);

        uint256 offset = page * pageSize;
        for (uint256 i = offset; i < offset + pageSize && i < _bridgeKeys.length; i++) {
            configs[i - offset] = _bridges[_bridgeKeys[i]].config;
            params[i - offset] = _bridges[_bridgeKeys[i]].params;
        }
        return (configs, params);
    }

    function isTokenRegistered(address token) public view returns (bool) {
        for (uint256 i = 0; i < _bridgeKeys.length; i++) {
            if (_bridges[_bridgeKeys[i]].tokenAddress == token) {
                return true;
            }
        }
        return false;
    }
}
