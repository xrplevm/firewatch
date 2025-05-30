import { polling, PollingOptions } from "@shared/utils";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers, AbiCoder, Contract } from "ethers";
import { AxelarExecutable, AxelarAmplifierGateway } from "@shared/evm/contracts";
import { findLogIndex, getContractDecodedEvents } from "@shared/evm/utils";
import { axelarGasServiceAbi } from "@shared/evm/contracts";

/**
 * Sends a payload via AxelarExecutable and then polls the destination contract’s state until it equals the sent payload.
 * This works for any payload—including an empty one.
 * @param sourceSigner The EthersSigner to use for sending the call.
 * @param destinationAxelarExecutable The AxelarExecutable instance whose state will be polled.
 * @param axelarGasServiceAddress The address of the Axelar Gas Service contract.
 * @param sourceGatewayAddress The gateway address to which the call is sent.
 * @param destinationChain The chain name (as used in the call) for the destination.
 * @param destinationContractAddress The destination contract address.
 * @param payload The payload to send (can be empty).
 * @param pollingOptions Polling options for state checking.
 * @param amount The amount of native gas to add for the cross-chain call.
 * @returns Promise<void>.
 */
export async function callContractAndExpectMessageUpdate(
    sourceSigner: EthersSigner,
    destinationAxelarExecutable: AxelarExecutable,
    axelarGasServiceAddress: string,
    sourceGatewayAddress: string,
    destinationChain: string,
    destinationContractAddress: string,
    payload: string,
    pollingOptions: PollingOptions,
    amount: string,
): Promise<void> {
    const abiCoder = new AbiCoder();
    const payload_encoded = abiCoder.encode(["string"], [payload]);

    const tx = await sourceSigner.callContract(sourceGatewayAddress, destinationChain, destinationContractAddress, payload_encoded);
    const receipt = await tx.wait();

    const logIndex = await findLogIndex(receipt.receipt, axelarGasServiceAbi, "ContractCall");

    if (logIndex === undefined) {
        throw new Error("ContractCall event not found in transaction logs");
    }

    await sourceSigner.addNativeGas(axelarGasServiceAddress, tx.hash, logIndex, amount);

    let decodedMsg: string;
    await polling(
        async () => {
            const finalEncoded = await destinationAxelarExecutable.lastPayload();
            if (!finalEncoded || finalEncoded === "0x" || finalEncoded.length === 0) {
                return false;
            }

            [decodedMsg] = abiCoder.decode(["string"], finalEncoded);

            return decodedMsg === payload;
        },
        (done) => !done,
        pollingOptions,
    );
}

/**
 * Helper for event emission tests.
 * Sends a payload via AxelarExecutable then polls for:
 *   - A "ContractCall" event on the provided gateway contract.
 *   - An "Executed" event on the destination call contract.
 * @param sourceSigner The signer to use for sending the call.
 * @param sourceGatewayAddr The gateway address to which the call is sent.
 * @param axelarGasServiceAddress The address of the Axelar Gas Service contract.
 * @param destinationChain The destination chain name (as used in the call).
 * @param destinationAxelarExecutable The destination AxelarExecutable instance (whose .address is used in filtering).
 * @param destinationContractAddress The destination contract address.
 * @param sourceGwContract The AxelarAmplifierGateway instance to query for "ContractCall" events.
 * @param payload The payload to send (can be empty).
 * @param expectedFrom The expected sender address in the "Executed" event.
 * @param pollingOpts Polling options for event checking.
 * @param amount The amount of native gas to add for the cross-chain call.
 * @returns Promise<void>.
 */
export async function callContractAndExpectEventEmission(
    sourceSigner: EthersSigner,
    sourceGatewayAddr: string,
    axelarGasServiceAddress: string,
    destinationChain: string,
    destinationAxelarExecutable: AxelarExecutable,
    destinationContractAddress: string,
    sourceGwContract: AxelarAmplifierGateway,
    payload: string,
    expectedFrom: string,
    pollingOpts: PollingOptions,
    amount: string,
): Promise<void> {
    const coder = new AbiCoder();
    const payload_encoded = coder.encode(["string"], [payload]);
    const payloadHash = ethers.keccak256(payload_encoded);

    const tx = await sourceSigner.callContract(sourceGatewayAddr, destinationChain, destinationContractAddress, payload_encoded);
    const receipt = await tx.wait();

    const logIndex = await findLogIndex(receipt.receipt, axelarGasServiceAbi, "ContractCall");

    if (logIndex === undefined) {
        throw new Error("ContractCall event not found in transaction logs");
    }

    await sourceSigner.addNativeGas(axelarGasServiceAddress, tx.hash, logIndex, amount);

    await polling(
        async () => {
            const decodedEvents = await getContractDecodedEvents(sourceGwContract as unknown as Contract, "ContractCall", -1);
            const match = decodedEvents.find(
                (decoded) =>
                    decoded.args.payloadHash === payloadHash &&
                    decoded.args.destinationChain === destinationChain &&
                    decoded.args.destinationContractAddress === destinationContractAddress,
            );

            return Boolean(match);
        },
        (result) => !result,
        pollingOpts,
    );

    await polling(
        async () => {
            const decodedEvents = await getContractDecodedEvents(destinationAxelarExecutable as unknown as Contract, "Executed", -1);

            const match = decodedEvents.find((decoded) => decoded.args._payload === payload && decoded.args._from === expectedFrom);

            return Boolean(match);
        },
        (result) => !result,
        pollingOpts,
    );
}
