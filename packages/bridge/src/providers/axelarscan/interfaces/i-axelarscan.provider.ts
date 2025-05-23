import { GMPStatusResponse } from "@axelar-network/axelarjs-sdk";
import { LifecycleInfo, AxelarCallInfo, AxelarMetrics } from "../axelarscan.provider.types";

export interface IAxelarScanProvider {
    /**
     * Fetches high-level lifecycle information for a GMP transaction.
     * @param txHash The transaction hash.
     * @returns LifecycleInfo containing status and error fields.
     */
    fetchOutcome(txHash: string): Promise<LifecycleInfo>;

    /**
     * Fetches metrics such as time spent and gas paid info for a GMP transaction.
     * @param txHash The transaction hash.
     * @returns AxelarMetrics containing timeSpent and gasPaidInfo.
     */
    fetchMetrics(txHash: string): Promise<AxelarMetrics>;

    /**
     * Fetches the full status response from the Axelar SDK for a GMP transaction.
     * @param txHash The transaction hash.
     * @returns The full GMPStatusResponse object.
     */
    fetchFullStatus(txHash: string): Promise<GMPStatusResponse>;

    /**
     * Fetches on-chain call and event metadata for a GMP transaction.
     * @param txHash The transaction hash.
     * @returns AxelarCallInfo containing callTx, approved, expressExecuted, executed, and callback fields.
     */
    fetchEvents(txHash: string): Promise<AxelarCallInfo>;

    /**
     * Checks if the given transaction is already executed on the destination chain.
     * @param txHash The transaction hash.
     * @returns True if the transaction is executed, false otherwise.
     */
    isExecuted(txHash: string): Promise<boolean>;

    /**
     * Checks if the given transaction is already confirmed on the source chain.
     * @param txHash The transaction hash.
     * @returns True if the transaction is confirmed, false otherwise.
     */
    isConfirmed(txHash: string): Promise<boolean>;

    /**
     * Gets the Axelar GMP API endpoint URL.
     * @returns The endpoint URL as a string.
     */
    getEndpoint(): string;
}
