#!/usr/bin/env node --no-warnings --loader ts-node/esm
import { Bridge, BridgeManager, BridgeSource } from "xchain-sdk";
import { MAINCHAIN_DOOR, SIDECHAIN_DOOR } from "./doors.js";
import ora from "ora";
import {
    getAmount,
    getBridgeDirectionFromSources,
    getSelectedXChainBridge,
    getSources,
    getXChainWallet,
    setBridgeManagerListeners,
} from "./hepers.js";

async function main() {
    console.clear();

    const sources = await getSources();

    const loadingXChainBridges = ora("Loading").start();

    const bridgeManager = await BridgeManager.createAsync(MAINCHAIN_DOOR, SIDECHAIN_DOOR);

    const xChainBridges = await bridgeManager.getXChainBridges();

    loadingXChainBridges.stop();

    const xChainBridge = await getSelectedXChainBridge(xChainBridges, sources);

    const originWallet = await getXChainWallet(BridgeSource.ORIGIN, sources.origin);
    const destinationWallet = await getXChainWallet(BridgeSource.DESTINATION, sources.destination);

    const originAddress = await originWallet.getAddress();
    const destinationAddress = await destinationWallet.getAddress();

    const direction = getBridgeDirectionFromSources(xChainBridge, sources);
    const bridge = new Bridge(direction, xChainBridge);

    const amount = await getAmount();

    setBridgeManagerListeners(bridgeManager, bridge, originAddress, destinationAddress, amount);

    try {
        await bridgeManager.transfer(bridge, originWallet, destinationWallet, amount);
    } catch (_e) {
        // Handled by the "failed" listener
        console.log(_e);
    }
}

main();
