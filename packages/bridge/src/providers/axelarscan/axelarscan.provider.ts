import { AxelarQueryAPI } from "@axelar-network/axelarjs-sdk";
import { LifecycleInfo } from "./axelarscan.provider.types";
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
    async fetchCallback(txHash: string): Promise<any> {
        const response = await this.recoveryApi.queryTransactionStatus(txHash);
        return response.callback;
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
