import { CreateBridgeFixture, CreateBridgeResult, DeployBridgeTokenFixture, DeploySafeFixture } from "./types";
import { DeploySafeFixtures } from "./deploy-safe-fixtures";
import { deploySafe } from "./deploy-safe";
import { deployBridgeDoor } from "./deploy-bridge-door";
import { deployBridgeToken } from "./deploy-bridge-token";
import { createBridge } from "./create-bridge";
import { ValidCreateBridgeFixtures } from "./create-bridge-fixtures";
import { DeployBridgeTokenFixtures } from "./deploy-bridge-token-fixtures";
import { BridgeType, bridgeTypeFromCreateBridgeFixture } from "../core/bridgeType";
import hre from "hardhat";

function deployValidFixture(
    safeFixture: DeploySafeFixture,
    bridgeTokenFixture: DeployBridgeTokenFixture,
    createBridgeFixture: CreateBridgeFixture,
): () => Promise<CreateBridgeResult> {
    return async function fixture() {
        const deploySafeResult = await deploySafe(safeFixture)();
        const deployBridgeDoorResult = await deployBridgeDoor(deploySafeResult, createBridgeFixture)();
        const deployBridgeTokenResult = await deployBridgeToken(bridgeTokenFixture)();
        return createBridge(deployBridgeDoorResult, deployBridgeTokenResult, createBridgeFixture)();
    };
}

export const withFixtures = async (exec: (params: CreateBridgeResult, fromBlock: number) => Promise<void>, bridgeTypes?: BridgeType[]) => {
    for (const safeFixture of DeploySafeFixtures) {
        for (const bridgeTokenFixture of DeployBridgeTokenFixtures) {
            for (const createBridgeFixture of ValidCreateBridgeFixtures) {
                if (!bridgeTypes || (bridgeTypes && bridgeTypes.indexOf(bridgeTypeFromCreateBridgeFixture(createBridgeFixture)) >= 0)) {
                    const execParams = await deployValidFixture(safeFixture, bridgeTokenFixture, createBridgeFixture)();
                    const fromBlock = (await hre.ethers.provider.getBlock("latest")).number;
                    await exec(execParams, fromBlock);
                }
            }
        }
    }
};
