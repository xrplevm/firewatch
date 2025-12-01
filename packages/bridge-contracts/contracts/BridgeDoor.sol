// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "./Manageable.sol";
import "./GnosisSafeL2.sol";
import "./XChainTypes.sol";
import "./XChainBridgeStore.sol";

abstract contract BridgeDoor is Manageable, XChainBridgeStore {
    event CreateClaim(bytes32 indexed bridgeKey, uint256 indexed claimId, address indexed creator, address sender);
    event Commit(bytes32 indexed bridgeKey, uint256 indexed claimId, address indexed sender, uint256 value, address receiver);
    event CommitWithoutAddress(bytes32 indexed bridgeKey, uint256 indexed claimId, address indexed sender, uint256 value);
    event Claim(bytes32 indexed bridgeKey, uint256 indexed claimId, address indexed sender, uint256 value, address destination);
    event CreateAccountCommit(
        bytes32 indexed bridgeKey,
        address indexed creator,
        address indexed destination,
        uint256 value,
        uint256 signatureReward
    );
    event AddClaimAttestation(bytes32 indexed bridgeKey, uint256 indexed claimId, address indexed witness, uint256 value, address receiver);
    event AddCreateAccountAttestation(bytes32 indexed bridgeKey, address indexed witness, address indexed receiver, uint256 value);
    event Credit(bytes32 indexed bridgeKey, uint256 indexed claimId, address indexed receiver, uint256 value);
    event CreateAccount(address indexed receiver, uint256 value);
    event CreateBridge(
        bytes32 indexed bridgeKey,
        address lockingChainDoor,
        address lockingChainIssueIssuer,
        string lockingChainIssueCurency,
        address issuingChainDoor,
        address issuingChainIssueIssuer,
        string issuingChainIssueCurency
    );
    event CreateBridgeRequest(address tokenAddress);

    GnosisSafeL2 public _safe;

    // Analog of XChainCreateBridge
    function createBridge(XChainTypes.BridgeConfig memory config, XChainTypes.BridgeParams memory params) public virtual;

    function createBridgeRequest(address token) public payable virtual;

    // Analog of XChainCreateClaimID
    function createClaimId(XChainTypes.BridgeConfig memory bridgeConfig, address sender) public payable virtual returns (uint256);

    // Analog of XChainCommit
    function commit(XChainTypes.BridgeConfig memory bridgeConfig, address receiver, uint256 claimId, uint256 amount) public payable virtual;

    // Analog of XChainCommit without address
    function commitWithoutAddress(XChainTypes.BridgeConfig memory bridgeConfig, uint256 claimId, uint256 amount) public payable virtual;

    // Analog of XChainClaim
    function claim(XChainTypes.BridgeConfig memory bridgeConfig, uint256 claimId, uint256 amount, address destination) public virtual;

    // Analog of XChainCreateAccountCommit
    function createAccountCommit(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address destination,
        uint256 amount,
        uint256 signatureReward
    ) public payable virtual;

    // Analog of XChainAddAttestation
    function addClaimAttestation(
        XChainTypes.BridgeConfig memory bridgeConfig,
        uint256 claimId,
        uint256 amount,
        address sender,
        address destination
    ) public virtual;

    // Analog of XChainAddAttestation
    function addCreateAccountAttestation(
        XChainTypes.BridgeConfig memory bridgeConfig,
        address destination,
        uint256 amount,
        uint256 signatureReward
    ) public virtual;

    function getWitnesses() public view virtual returns (address[] memory);

    function sendTransaction(address payable destination, uint256 value) internal virtual;

    function sendAssets(XChainTypes.BridgeConfig memory bridgeConfig, address destination, uint256 amount) internal virtual;

    /// @dev Fallback function allows to deposit ether.
    receive() external payable {}
}
