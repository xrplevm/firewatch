import { GMPStatusResponse } from "@axelar-network/axelarjs-sdk";
import { PatchedRecoveryAPI } from "./utils/patched-recovery.api";
import { AxelarCallInfo, LifecycleInfo, AxelarMetrics } from "./axelarscan.provider.types";
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
}
