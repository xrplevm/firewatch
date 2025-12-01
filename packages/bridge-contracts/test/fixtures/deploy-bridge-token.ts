import { BridgeToken } from "../../typechain-types";
import { ethers } from "hardhat";
import { DeployBridgeTokenFixture, DeployBridgeTokenResult } from "./types";

export function deployBridgeToken({ params }: DeployBridgeTokenFixture): () => Promise<DeployBridgeTokenResult> {
    return async function fixture() {
        const BridgeToken = await ethers.getContractFactory("BridgeToken");
        const bridgeToken = (await BridgeToken.deploy(params.tokenName, params.tokenCode)) as BridgeToken;
        await bridgeToken.deployed();
        return { bridgeToken };
    };
}
