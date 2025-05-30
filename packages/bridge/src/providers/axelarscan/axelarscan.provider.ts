import { AxelarQueryAPI } from "@axelar-network/axelarjs-sdk";
import { GasAddedTransactions, LifecycleInfo } from "./axelarscan.provider.types";
import { AxelarGMPRecoveryAPI } from "@axelar-network/axelarjs-sdk";
import { toSdkEnv } from "./utils";
import { Env } from "@firewatch/env/types";
import { IAxelarScanProvider } from "./interfaces";

export class AxelarScanProvider implements IAxelarScanProvider {
    private recoveryApi: AxelarGMPRecoveryAPI;

    constructor(environment: Env) {
        const sdkEnv = toSdkEnv(environment);
        this.recoveryApi = new AxelarGMPRecoveryAPI({ environment: sdkEnv });
    }

    /**
     * @inheritdoc
     */
    async fetchOutcome(txHash: string): Promise<LifecycleInfo> {
        return await this.recoveryApi.queryTransactionStatus(txHash);
    }

    /**
     * @inheritdoc
     */
    async fetchGasAddedTransactions(txHash: string): Promise<GasAddedTransactions> {
        const response = await this.recoveryApi.fetchGMPTransaction(txHash);
        return response.gas_added_transactions;
    }

    /**
     * @inheritdoc
     */
    async fetchCallbackTransactionHash(txHash: string): Promise<string> {
        const response = await this.recoveryApi.queryTransactionStatus(txHash);
        return response.callback.transactionHash;
    }

    /**
     * @inheritdoc
     */
    getEndpoint(): string {
        return this.recoveryApi.getAxelarGMPApiUrl;
    }

    /**
     * @inheritdoc
     */
    async estimateGasFee(sourceChain: string, destinationChain: string, gasToken: string, gasLimit: string | number): Promise<string> {
        const limit = typeof gasLimit === "string" ? Number(gasLimit) : gasLimit;

        const api = new AxelarQueryAPI({
            environment: this.recoveryApi.environment,
        });

        const feeResponse = await api.estimateGasFee(sourceChain, destinationChain, limit, "auto", gasToken, undefined);

        return feeResponse as string;
    }
}
