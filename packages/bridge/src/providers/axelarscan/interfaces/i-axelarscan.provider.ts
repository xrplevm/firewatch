import { GMPStatusResponse } from "@axelar-network/axelarjs-sdk";
import { LifecycleInfo } from "../axelarscan.provider.types";

export interface IAxelarScanProvider {
    /**
     * Fetches high-level lifecycle information for a GMP transaction.
     * @param txHash The transaction hash to query.
     * @returns LifecycleInfo containing status and error fields.
     */
    fetchOutcome(txHash: string): Promise<LifecycleInfo>;

    /**
     * Fetch full gmp transaction for a given transaction hash.
     * @param txHash The transaction hash to query.
     * @returns A promise that resolves to the full transaction data.
     */
    fetchFullTransaction(txHash: string): Promise<any>;

    /**
     * Fetches the callback data for a given transaction hash.
     * @param txHash The transaction hash to query.
     * @returns A promise that resolves to the callback data associated with the transaction.
     */
    fetchCallback(txHash: string): Promise<GMPStatusResponse["callback"]>;

    /**
     * Gets the Axelar GMP API endpoint URL.
     * @returns The endpoint URL as a string.
     */
    getEndpoint(): string;

    /**
     * Estimates the gas fee for a cross-chain contract call using AxelarQueryAPI.
     * @param sourceChain The name of the source blockchain (e.g., 'ethereum', 'polygon').
     * @param destinationChain The name of the destination blockchain (e.g., 'avalanche', 'fantom').
     * @param gasToken The token symbol used to pay for gas (e.g., 'USDC', 'USDT').
     * @param gasLimit The maximum amount of gas units that can be consumed for execution.
     * @returns The estimated gas fee response containing fee amount and token details.
     */
    estimateGasFee(sourceChain: string, destinationChain: string, gasToken: string, gasLimit: string | number): Promise<string>;
}
