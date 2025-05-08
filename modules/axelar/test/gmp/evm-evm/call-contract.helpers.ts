import { polling, PollingOptions } from "@shared/utils";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers, AbiCoder, Contract } from "ethers";
import { AxelarExecutableExample, AxelarAmplifierGateway } from "@shared/evm/contracts";
import { getContractDecodedEvents } from "@shared/evm/utils";

/**
 * Sends a payload via AxelarExecutableExample and then polls the destination contract’s state until it equals the sent payload.
 * This works for any payload—including an empty one.
 * @param sourceSigner The EthersSigner to use for sending the call.
 * @param destinationAxelarExecutableExample The AxelarExecutableExample instance whose state will be polled.
 * @param sourceGatewayAddress The gateway address to which the call is sent.
 * @param destinationChain The chain name (as used in the call) for the destination.
 * @param destinationContractAddress The destination contract address.
 * @param payload The payload to send (can be empty).
 * @param pollingOptions Polling options.
 */
export async function expectMessageUpdate(
    sourceSigner: EthersSigner,
    destinationAxelarExecutableExample: AxelarExecutableExample,
    sourceGatewayAddress: string,
    destinationChain: string,
    destinationContractAddress: string,
    payload: string,
    pollingOptions: PollingOptions,
): Promise<void> {
    const abiCoder = new AbiCoder();
    const payload_encoded = abiCoder.encode(["string"], [payload]);

    const tx = await sourceSigner.callContract(sourceGatewayAddress, destinationChain, destinationContractAddress, payload_encoded);
    console.log(`[expectMessageUpdate] Transaction hash:`, tx.hash);

    let finalMessage: string;
    await polling(
        async () => {
            finalMessage = await destinationAxelarExecutableExample.message();
            console.log(`[expectMessageUpdate] Polled lastPayload:`, finalMessage, `| Expected:`, payload);

            return finalMessage === payload;
        },
        (result) => !result,
        pollingOptions,
    );
}

/**
 * Helper for event emission tests.
 * Sends a payload via AxelarExecutableExample then polls for:
 *   - A "ContractCall" event on the provided gateway contract.
 *   - An "Executed" event on the destination call contract.
 * @param sourceSigner The signer to use for sending the call.
 * @param sourceGatewayAddr The gateway address to which the call is sent.
 * @param destinationChain The destination chain name (as used in the call).
 * @param destinationAxelarExecutableExample The destination AxelarExecutableExample instance (whose .address is used in filtering).
 * @param destinationContractAddress The destination contract address.
 * @param sourceGwContract The AxelarAmplifierGateway instance to query for "ContractCall" events.
 * @param payload The payload to send (can be empty).
 * @param expectedFrom The expected sender address in the "Executed" event.
 * @param pollingOpts Polling options.
 */
export async function expectEventEmission(
    sourceSigner: EthersSigner,
    sourceGatewayAddr: string,
    destinationChain: string,
    destinationAxelarExecutableExample: AxelarExecutableExample,
    destinationContractAddress: string,
    sourceGwContract: AxelarAmplifierGateway,
    payload: string,
    expectedFrom: string,
    pollingOpts: PollingOptions,
): Promise<void> {
    const coder = new AbiCoder();
    const payload_encoded = coder.encode(["string"], [payload]);
    const payloadHash = ethers.keccak256(payload_encoded);

    // Send the call.
    await sourceSigner.callContract(sourceGatewayAddr, destinationChain, destinationContractAddress, payload_encoded);

    await polling(
        async () => {
            const decodedEvents = await getContractDecodedEvents(sourceGwContract as unknown as Contract, "ContractCall", -1);
            const match = decodedEvents.find(
                (decoded) =>
                    decoded.args.payloadHash === payloadHash &&
                    decoded.args.destinationChain === destinationChain &&
                    decoded.args.destinationContractAddress === destinationContractAddress,
            );
            console.log(`[expectEventEmission] Polled ContractCall events: found=${!!match}`);

            return Boolean(match);
        },
        (result) => !result,
        pollingOpts,
    );

    await polling(
        async () => {
            const decodedEvents = await getContractDecodedEvents(destinationAxelarExecutableExample as unknown as Contract, "Executed", -1);
            console.log(`[expectEventEmission] Polled Executed events:`, decodedEvents);
            const match = decodedEvents.find((decoded) => decoded.args._payload === payload && decoded.args._from === expectedFrom);
            console.log(`[expectEventEmission] Polled Executed events: found=${!!match}`);
            return Boolean(match);
        },
        (result) => !result,
        pollingOpts,
    );
}
