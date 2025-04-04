import { polling, PollingOptions } from "@shared/utils";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers, AbiCoder, Contract } from "ethers";
import { CallContract, AxelarAmplifierGateway } from "@shared/evm/contracts";
import { getContractDecodedEvents } from "@shared/evm/utils";
import { Token } from "@firewatch/core/token";

/**
 * Sends a message via callContract and then polls the destination contract’s state until it equals the sent message.
 * This works for any message—including an empty one.
 *
 * @param sourceSigner The EthersSigner to use for sending the call.
 * @param destinationCallContract The CallContract instance whose state will be polled.
 * @param sourceGatewayAddress The gateway address to which the call is sent.
 * @param destinationChain The chain name (as used in the call) for the destination.
 * @param destinationAddress The destination contract address.
 * @param message The message to send (can be empty).
 * @param pollingOptions Polling options.
 */
export async function expectMessageUpdate(
    sourceSigner: EthersSigner,
    destinationCallContract: CallContract,
    sourceGatewayAddress: string,
    destinationChain: string,
    destinationAddress: string,
    message: string,
    pollingOptions: PollingOptions,
): Promise<void> {
    const abiCoder = new AbiCoder();
    const payload = abiCoder.encode(["string"], [message]);

    await sourceSigner.callContract(sourceGatewayAddress, destinationChain, destinationAddress, payload);

    let finalMessage: string;
    await polling(
        async () => {
            finalMessage = await destinationCallContract.message();
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
 *   - An "Executed" event on the destination call contract.
 *
 * @param sourceSigner The signer to use for sending the call.
 * @param sourceGatewayAddr The gateway address to which the call is sent.
 * @param destinationChain The destination chain name (as used in the call).
 * @param destinationCallContract The destination CallContract instance (whose .address is used in filtering).
 * @param destinationAddress The destination contract address.
 * @param sourceGwContract The AxelarAmplifierGateway instance to query for "ContractCall" events.
 * @param message The message to send (can be empty).
 * @param expectedFrom The expected sender address in the "Executed" event.
 * @param pollingOpts Polling options.
 */
export async function expectEventEmission(
    sourceSigner: EthersSigner,
    sourceGatewayAddr: string,
    destinationChain: string,
    destinationCallContract: CallContract,
    destinationAddress: string,
    sourceGwContract: AxelarAmplifierGateway,
    message: string,
    expectedFrom: string,
    pollingOpts: PollingOptions,
): Promise<void> {
    const coder = new AbiCoder();
    const payload = coder.encode(["string"], [message]);
    const payloadHash = ethers.keccak256(payload);

    // Send the call.
    await sourceSigner.callContract(sourceGatewayAddr, destinationChain, destinationAddress, payload);

    await polling(
        async () => {
            const decodedEvents = await getContractDecodedEvents(sourceGwContract as unknown as Contract, "ContractCall", -1);
            const match = decodedEvents.find(
                (decoded) =>
                    decoded.args.payloadHash === payloadHash &&
                    decoded.args.destinationChain === destinationChain &&
                    decoded.args.destinationContractAddress === destinationAddress,
            );
            return Boolean(match);
        },
        (result) => !result,
        pollingOpts,
    );

    await polling(
        async () => {
            const decodedEvents = await getContractDecodedEvents(destinationCallContract as unknown as Contract, "Executed", -1);
            const match = decodedEvents.find((decoded) => decoded.args._message === message && decoded.args._from === expectedFrom);
            return Boolean(match);
        },
        (result) => !result,
        pollingOpts,
    );
}
