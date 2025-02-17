import { polling, PollingOptions } from "@shared/utils";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers, AbiCoder, Contract } from "ethers";
import { CallContract, AxelarAmplifierGateway } from "../../../../../packages/shared/evm/src/contracts";
import { getDecodedEvents } from "../../../../../packages/shared/evm/src/utils/event-helpers";

/**
 * Sends a message via callContract and then polls the target contract’s state until it equals the sent message.
 * This works for any message—including an empty one.
 *
 * @param signer The EthersSigner to use for sending the call.
 * @param sourceCallContract The CallContract instance whose state will be polled.
 * @param gatewayAddress The gateway address to which the call is sent.
 * @param targetChain The chain name (as used in the call) for the target.
 * @param targetAddress The target contract address.
 * @param message The message to send (can be empty).
 * @param pollingOptions Polling options.
 */
export async function testMessageUpdate(
    signer: EthersSigner,
    sourceCallContract: CallContract,
    gatewayAddress: string,
    targetChain: string,
    targetAddress: string,
    message: string,
    pollingOptions: PollingOptions,
): Promise<void> {
    const abiCoder = new AbiCoder();
    const payload = abiCoder.encode(["string"], [message]);

    // Send the call.
    await signer.callContract(gatewayAddress, targetChain, targetAddress, payload);

    // Poll until the contract's stored message equals the expected message.
    let finalMessage: string;
    await polling(
        async () => {
            finalMessage = await sourceCallContract.message();
            return finalMessage === message;
        },
        (result) => !result,
        pollingOptions,
    );
}

/**
 * Helper for event emission tests.
 * Sends a message via callContract then polls for:
 *   - A "ContractCall" event on the provided gateway contract.
 *   - An "Executed" event on the target call contract.
 *
 * @param signer The signer to use for sending the call.
 * @param gatewayAddr The gateway address to which the call is sent.
 * @param targetChain The target chain name (as used in the call).
 * @param targetCallContract The target CallContract instance (whose .address is used in filtering).
 * @param targetAddress The target contract address.
 * @param gwContract The AxelarAmplifierGateway instance to query for "ContractCall" events.
 * @param message The message to send (can be empty).
 * @param expectedFrom The expected sender address in the "Executed" event.
 * @param pollingOpts Polling options.
 */
export async function testEventEmission(
    signer: EthersSigner,
    gatewayAddr: string,
    targetChain: string,
    targetCallContract: CallContract,
    targetAddress: string,
    gwContract: AxelarAmplifierGateway,
    message: string,
    expectedFrom: string,
    pollingOpts: PollingOptions,
): Promise<void> {
    const coder = new AbiCoder();
    const payload = coder.encode(["string"], [message]);
    const payloadHash = ethers.keccak256(payload);

    // Send the call.
    await signer.callContract(gatewayAddr, targetChain, targetAddress, payload);

    await polling(
        async () => {
            const decodedEvents = await getDecodedEvents(gwContract as unknown as Contract, "ContractCall", -1);
            const match = decodedEvents.find(
                (decoded) =>
                    decoded.args.payloadHash === payloadHash &&
                    decoded.args.destinationChain === targetChain &&
                    decoded.args.destinationContractAddress === targetAddress,
            );
            return Boolean(match);
        },
        (result) => !result,
        pollingOpts,
    );

    await polling(
        async () => {
            const decodedEvents = await getDecodedEvents(targetCallContract as unknown as Contract, "Executed", -1);
            const match = decodedEvents.find((decoded) => decoded.args._message === message && decoded.args._from === expectedFrom);
            return Boolean(match);
        },
        (result) => !result,
        pollingOpts,
    );
}
