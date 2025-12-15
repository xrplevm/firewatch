import {
    Bridge,
    BridgeDirection,
    BridgeDoor,
    BridgeManager,
    BridgeSource,
    BridgeTransferType,
    ChainType,
    XChainBridge,
    XChainWallet,
} from "xchain-sdk";
import { MAINCHAIN_DOOR, SIDECHAIN_DOOR } from "./doors.js";
import { DistinctChoice } from "inquirer";
import inquirer from "inquirer";
import { WalletsFactory } from "./wallets-factory.js";
import ora from "ora";

export enum BridgeDoorsDirection {
    MAINCHAIN_TO_SIDECHAIN = "mainchainToSidechain",
    SIDECHAIN_TO_MAINCHAIN = "sidechainToMainchain",
}

export type BridgeSources = {
    origin: BridgeDoor;
    destination: BridgeDoor;
};

export const brideDoorDirectionOptions = [
    { name: `${MAINCHAIN_DOOR.id} -> ${SIDECHAIN_DOOR.id}`, value: BridgeDoorsDirection.MAINCHAIN_TO_SIDECHAIN },
    { name: `${SIDECHAIN_DOOR.id} -> ${MAINCHAIN_DOOR.id}`, value: BridgeDoorsDirection.SIDECHAIN_TO_MAINCHAIN },
];

export async function getSources(): Promise<BridgeSources> {
    const { direction } = await inquirer.prompt([
        { type: "list", name: "direction", message: "Select the direction of the bridge", choices: brideDoorDirectionOptions },
    ]);

    return direction === BridgeDoorsDirection.MAINCHAIN_TO_SIDECHAIN
        ? { origin: MAINCHAIN_DOOR, destination: SIDECHAIN_DOOR }
        : { origin: SIDECHAIN_DOOR, destination: MAINCHAIN_DOOR };
}

export function buildXChainBridgeChoices(xChainBridges: XChainBridge[], { origin }: BridgeSources): DistinctChoice[] {
    return xChainBridges.map((xChainBridge) => ({
        name:
            xChainBridge.lockingChain.id === origin.id
                ? `${xChainBridge.lockingChain.issue.currency} - ${xChainBridge.issuingChain.issue.currency}`
                : `${xChainBridge.issuingChain.issue.currency} - ${xChainBridge.lockingChain.issue.currency}`,
        value: xChainBridge,
    }));
}

export async function getSelectedXChainBridge(xChainBridges: XChainBridge[], sources: BridgeSources): Promise<XChainBridge> {
    const xChainBridgeChoices = buildXChainBridgeChoices(xChainBridges, sources);

    const { xChainBridge: selectedXChainBridge } = await inquirer.prompt([
        { type: "list", name: "xChainBridge", message: "Select a bridge", choices: xChainBridgeChoices },
    ]);

    return selectedXChainBridge;
}

export const ENTER_SECRET_MESSAGE: Record<ChainType, string> = {
    [ChainType.XRP]: "Enter the {{source}} ({{chain}}) wallet seed",
    [ChainType.EVM]: "Enter the {{source}} ({{chain}}) private key",
};

export function getEnterSecretMessage(source: BridgeSource, type: ChainType, chain?: string): string {
    return ENTER_SECRET_MESSAGE[type].replace("{{source}}", source).replace("{{chain}}", chain ?? type.toUpperCase());
}

export async function getXChainWallet<TBridgeDoor extends BridgeDoor>(source: BridgeSource, door: TBridgeDoor): Promise<XChainWallet> {
    const { secret } = await inquirer.prompt([
        { type: "password", name: "secret", message: getEnterSecretMessage(source, door.type, door.id) },
    ]);

    return WalletsFactory.get(door, secret);
}

export function getBridgeDirectionFromSources(xChainBridge: XChainBridge, sources: BridgeSources): BridgeDirection {
    return xChainBridge.lockingChain.id === sources.origin.id ? BridgeDirection.LOCKING_TO_ISSUING : BridgeDirection.ISSUING_TO_LOCKING;
}

export async function getAmount(): Promise<string> {
    const { amount } = await inquirer.prompt([{ type: "number", name: "amount", message: "Enter the amount to transfer" }]);
    return amount.toString();
}

export async function getTokenAddress(): Promise<string> {
    const { tokenAddress } = await inquirer.prompt([{ type: "input", name: "tokenAddress", message: "Enter the token address: (ERC-20)" }]);
    return tokenAddress.toString();
}

export function setBridgeManagerListeners(
    bridgeManager: BridgeManager,
    bridge: Bridge,
    originAddress: string,
    destinationAddress: string,
    amount: string,
): void {
    bridgeManager.on("start", (data) =>
        ora(`Starting ${data.transferType === BridgeTransferType.CLAIM_COMMIT ? "claim and commit" : "create account"} transfer`).succeed(),
    );

    const trustClaimLoading = ora();
    bridgeManager.on("trustClaimRequested", () => trustClaimLoading.start(`Signing the set trust transaction with ${destinationAddress}`));
    bridgeManager.on(
        "trustClaimSigned",
        () => (trustClaimLoading.text = `Broadcasting the set trust transaction with ${destinationAddress} `),
    );
    bridgeManager.on("trustClaimConfirmed", () =>
        trustClaimLoading.succeed(`Confirmed the set trust transaction with ${destinationAddress}`),
    );

    const trustCommitLoading = ora();
    bridgeManager.on("trustCommitRequested", () =>
        trustCommitLoading.start(`Signing the approve bridge contract transaction with ${originAddress}`),
    );
    bridgeManager.on(
        "trustCommitSigned",
        () => (trustCommitLoading.text = `Broadcasting the approve bridge contract transaction with ${originAddress} `),
    );
    bridgeManager.on("trustCommitConfirmed", () =>
        trustCommitLoading.succeed(`Confirmed the approve bridge contract transaction with ${originAddress}`),
    );

    const createClaimLoading = ora();
    bridgeManager.on("createClaimRequested", () =>
        createClaimLoading.start(`Signing the create claim transaction with ${destinationAddress}`),
    );
    bridgeManager.on(
        "createClaimSigned",
        () => (createClaimLoading.text = `Broadcasting the create claim transaction with ${destinationAddress} `),
    );
    bridgeManager.on("createClaimConfirmed", () =>
        createClaimLoading.succeed(`Confirmed the create claim transaction with ${destinationAddress}`),
    );

    const commitLoading = ora();
    bridgeManager.on("commitRequested", () => commitLoading.start(`Signing the commit transaction with ${originAddress}`));
    bridgeManager.on("commitSigned", () => (commitLoading.text = `Broadcasting the commit transaction with ${originAddress} `));
    bridgeManager.on("commitConfirmed", () => commitLoading.succeed(`Confirmed the commit transaction with ${originAddress} `));

    const createAccountCommitLoading = ora();
    bridgeManager.on("createAccountCommitRequested", () =>
        createAccountCommitLoading.start(`Signing the create account commit transaction with ${originAddress}`),
    );
    bridgeManager.on(
        "createAccountCommitSigned",
        () => (createAccountCommitLoading.text = `Broadcasting the create account commit transaction with ${originAddress}`),
    );
    bridgeManager.on("createAccountCommitConfirmed", () =>
        createAccountCommitLoading.succeed(`Confirmed the create account commit transaction with ${originAddress}`),
    );

    const attestationsLoading = ora();
    bridgeManager.on("attestationsStarted", () =>
        attestationsLoading.start("Attestations started, waiting for witnesses to attest the transfer"),
    );
    bridgeManager.on("attestationsCompleted", () => attestationsLoading.succeed("Attestations completed. The funds are on the way!"));

    bridgeManager.on("completed", (result) => {
        ora(
            `Transfer of ${amount} ${bridge.originXChainBridgeChain.issue.currency} completed! Here are the details:\n${
                result.isCreateAccount === false
                    ? `${result.trustClaim ? `- Set trust hash: ${result.trustClaim.hash}\n` : ""}${
                          result.trustCommit ? `-Approve bridge contract hash: ${result.trustCommit.hash}\n` : ""
                      }- Create claim hash: ${result.createClaim.hash}\n- Commit hash: ${result.commit.hash}`
                    : `- Create account commit hash: ${result.createAccountCommit.hash}`
            }`,
        ).succeed();
        process.exit(0);
    });

    bridgeManager.on("failed", (error) => {
        ora(`Error: ${error}`).fail();
        process.exit(1);
    });
}
