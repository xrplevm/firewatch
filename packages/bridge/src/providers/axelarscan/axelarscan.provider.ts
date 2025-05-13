import {
    AxelarGMPRecoveryAPI,
    AxelarRecoveryAPIConfig,
    GMPStatusResponse,
    AxelarQueryAPI,
    AxelarQueryAPIFeeResponse,
} from "@axelar-network/axelarjs-sdk";
import { AxelarCallInfo, LifecycleInfo, AxelarMetrics } from "./axelarscan.provider.types";
import { PatchedRecoveryAPI } from "./utils/patched-recovery.api";
import { toSdkEnv } from "./utils";
import { Env } from "@firewatch/env/types";
import { IAxelarScanProvider } from "./interfaces";

export class AxelarScanProvider implements IAxelarScanProvider {
    private recoveryApi: PatchedRecoveryAPI;

    constructor(environment: Env, gmpApiUrl?: string) {
        const sdkEnv = toSdkEnv(environment);
        this.recoveryApi = new PatchedRecoveryAPI({ environment: sdkEnv }, gmpApiUrl);
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
    async fetchMetrics(txHash: string): Promise<AxelarMetrics> {
        return await this.recoveryApi.queryTransactionStatus(txHash);
    }

    /**
     * @inheritdoc
     */
    async fetchFullStatus(txHash: string): Promise<GMPStatusResponse> {
        return await this.recoveryApi.queryTransactionStatus(txHash);
    }

    /**
     * @inheritdoc
     */
    async fetchEvents(txHash: string): Promise<AxelarCallInfo> {
        return await this.recoveryApi.queryTransactionStatus(txHash);
    }

    /**
     * @inheritdoc
     */
    async isExecuted(txHash: string): Promise<boolean> {
        return await this.recoveryApi.isExecuted(txHash);
    }

    /**
     * @inheritdoc
     */
    async isConfirmed(txHash: string): Promise<boolean> {
        return await this.recoveryApi.isConfirmed(txHash);
    }

    getEndpoint(): string {
        return this.recoveryApi.getAxelarGMPApiUrl;
    }

    /**
     * @inheritdoc
     */
    async estimateGasFee(
        sourceChain: string,
        destinationChain: string,
        gasToken: string,
        gasLimit: string | number,
        executeData?: string,
    ): Promise<string> {
        const limit = typeof gasLimit === "string" ? Number(gasLimit) : gasLimit;

        const api = new AxelarQueryAPI({
            environment: this.recoveryApi.environment,
        });

        const feeResponse = await api.estimateGasFee(sourceChain, destinationChain, limit, "auto", gasToken, undefined, executeData);

        return feeResponse as string;
    }
}
