import { LifecycleInfo } from "../axelarscan.provider.types";

export interface IAxelarScanProvider {
    /**
     * Fetches high-level lifecycle information for a GMP transaction.
     * @param txHash The transaction hash.
     * @returns LifecycleInfo containing status and error fields.
     */
    fetchOutcome(txHash: string): Promise<LifecycleInfo>;

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
     * @param amount Optional. The token amount to be transferred, if applicable.
     * @returns The estimated gas fee response containing fee amount and token details.
     */
    estimateGasFee(
        sourceChain: string,
        destinationChain: string,
        gasToken: string,
        gasLimit: string | number,
        amount?: string | number,
    ): Promise<string>;
}
