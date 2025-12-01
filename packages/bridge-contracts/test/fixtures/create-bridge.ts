import { CreateBridgeFixture, CreateBridgeResult, DeployBridgeDoorResult, DeployBridgeTokenResult } from "./types";
import hre, { ethers } from "hardhat";
import { BridgeDoor, BridgeToken } from "../../typechain-types";
import { ContractTransaction } from "ethers";
import { XChainTypes } from "../../typechain-types/contracts/BridgeDoor";

export function createBridge(
    deployBridgeDoorResult: DeployBridgeDoorResult,
    deployBridgeTokenResult: DeployBridgeTokenResult,
    createBridgeFixture: CreateBridgeFixture,
    evaluateCreateBridgeTransaction?: (
        transaction: Promise<ContractTransaction>,
        bridgeDoor: BridgeDoor,
        bridgeConfig: XChainTypes.BridgeConfigStruct,
    ) => Promise<void>,
): () => Promise<CreateBridgeResult> {
    return async function fixture() {
        const params = createBridgeFixture.params;
        const bridgeConfig = params.config(deployBridgeDoorResult.doorSafeAddress, deployBridgeTokenResult.bridgeToken.address);

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [deployBridgeDoorResult.doorSafeAddress],
        });

        const safeSigner = await ethers.getSigner(deployBridgeDoorResult.doorSafeAddress);
        const action = deployBridgeDoorResult.bridgeDoor.connect(safeSigner).createBridge(bridgeConfig, params.params);
        if (evaluateCreateBridgeTransaction) await evaluateCreateBridgeTransaction(action, deployBridgeDoorResult.bridgeDoor, bridgeConfig);
        else await action;

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [deployBridgeDoorResult.doorSafeAddress],
        });

        let bridgeToken = deployBridgeTokenResult.bridgeToken;
        try {
            const bridgeTokenAddress = await deployBridgeDoorResult.bridgeDoor.getBridgeToken(bridgeConfig);
            const BridgeToken = await ethers.getContractFactory("BridgeToken");
            bridgeToken = BridgeToken.attach(bridgeTokenAddress) as BridgeToken;
        } catch (e) {}

        return {
            ...deployBridgeDoorResult,
            ...{
                bridgeToken,
            },
            config: bridgeConfig,
            params: params.params,
        };
    };
}
