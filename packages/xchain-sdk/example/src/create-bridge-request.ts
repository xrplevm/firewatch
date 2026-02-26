#!/usr/bin/env node --no-warnings --loader ts-node/esm
import { BridgeManager, BridgeSource, EthersXChainWallet } from "xchain-sdk";
import { getTokenAddress, getXChainWallet } from "./hepers.js";
import { MAINCHAIN_DOOR, SIDECHAIN_DOOR } from "./doors.js";
import ora from "ora";

async function main() {
    console.clear();

    const bridgeManager = await BridgeManager.createAsync(MAINCHAIN_DOOR, SIDECHAIN_DOOR);
    const sidechainWallet = (await getXChainWallet(BridgeSource.ORIGIN, SIDECHAIN_DOOR)) as EthersXChainWallet;

    const tokenAddress = await getTokenAddress();

    const createBridgeRequestLoading = ora();
    bridgeManager.on("createBridgeRequestRequested", () => {
        createBridgeRequestLoading.start(`Creating bridge request for ${tokenAddress}...`);
    });

    bridgeManager.on("createBridgeRequestSigned", () => {
        createBridgeRequestLoading.succeed(`Bridge request signed for ${tokenAddress}`);
    });

    bridgeManager.on("createBridgeRequestConfirmed", () => {
        createBridgeRequestLoading.succeed(`Bridge request confirmed for ${tokenAddress}`);
    });

    bridgeManager.on("createBridgeRequestFailed", () => {
        createBridgeRequestLoading.fail(`Bridge request failed for ${tokenAddress}`);
        process.exit(1);
    });

    try {
        const request = await bridgeManager.createBridgeRequest(tokenAddress, sidechainWallet);

        const waitCreationLoading = ora();

        waitCreationLoading.start(`Waiting for bridge request creation...`);

        const xChainBridge = await request.waitCreation();

        waitCreationLoading.succeed(`Bridge request created for ${tokenAddress} on ${xChainBridge.issuingChain.issue.currency}`);

        process.exit(0);
    } catch (_e) {
        console.log(_e);
    }
}

main();
