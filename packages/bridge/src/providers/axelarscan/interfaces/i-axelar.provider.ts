import { GMPStatusResponse } from "@axelar-network/axelarjs-sdk";
import { LifecycleInfo, AxelarCallInfo } from "../axelar.provider.types";

export interface IAxelarProvider {
    /**
     * Gets high-level lifecycle information for a GMP transaction.
     * @param txHash The transaction hash.
     * @returns Lifecycle information for the transaction.
     */
    getLifecycleInfo(txHash: string): Promise<LifecycleInfo>;

    /**
     * Gets the full status response from the Axelar SDK for a GMP transaction.
     * @param txHash The transaction hash.
     * @returns The full GMP status response.
     */
    getFullStatus(txHash: string): Promise<GMPStatusResponse>;

    /**
     * Gets the on-chain call metadata for a GMP transaction (block, event args, receipt, etc).
     * @param txHash The transaction hash.
     * @returns The call info (type is currently any, see AxelarCallInfo for details).
     */
    getCallInfo(txHash: string): Promise<AxelarCallInfo>;

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
}
