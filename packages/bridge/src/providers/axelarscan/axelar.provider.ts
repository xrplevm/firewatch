import { AxelarGMPRecoveryAPI, AxelarRecoveryAPIConfig, GMPStatusResponse } from "@axelar-network/axelarjs-sdk";
import { AxelarCallInfo, LifecycleInfo, AxelarMetrics } from "./axelar.provider.types";
import { toSdkEnv } from "./helpers";
import { Env } from "@firewatch/env/types";
import { IAxelarProvider } from "./interfaces";

class PatchedRecoveryAPI extends AxelarGMPRecoveryAPI {
    private _overrideUrl?: string;

    constructor(config: AxelarRecoveryAPIConfig, overrideUrl?: string) {
        super(config);
        this._overrideUrl = overrideUrl;
    }

    /**
     * Returns the Axelar GMP API URL, using the override if provided.
     */
    public override get getAxelarGMPApiUrl(): string {
        return this._overrideUrl ?? super.getAxelarGMPApiUrl;
    }
}

export class AxelarProvider implements IAxelarProvider {
    private recoveryApi: PatchedRecoveryAPI;

    constructor(environment: Env, gmpApiUrl?: string) {
        const sdkEnv = toSdkEnv(environment);
        this.recoveryApi = new PatchedRecoveryAPI({ environment: sdkEnv }, gmpApiUrl);
    }

    /**
     * @inheritdoc
     */
    async fetchOutcome(txHash: string): Promise<LifecycleInfo> {
        const full = await this.recoveryApi.queryTransactionStatus(txHash);
        const { status, error } = full;
        return { status, error };
    }

    /**
     * @inheritdoc
     */
    async fetchMetrics(txHash: string): Promise<AxelarMetrics> {
        const full = await this.recoveryApi.queryTransactionStatus(txHash);
        const { timeSpent, gasPaidInfo } = full;
        return { timeSpent, gasPaidInfo };
    }
    /**
     * @inheritdoc
     */
    async fetchFullStatus(txHash: string): Promise<GMPStatusResponse> {
        return this.recoveryApi.queryTransactionStatus(txHash);
    }

    /**
     * @inheritdoc
     */
    async fetchEvents(txHash: string): Promise<AxelarCallInfo> {
        const { callTx, approved, expressExecuted, executed, callback } = await this.recoveryApi.queryTransactionStatus(txHash);
        return {
            callTx,
            approved,
            expressExecuted,
            executed,
            callback,
        };
    }

    /**
     * @inheritdoc
     */
    async isExecuted(txHash: string): Promise<boolean> {
        return this.recoveryApi.isExecuted(txHash);
    }

    /**
     * @inheritdoc
     */
    async isConfirmed(txHash: string): Promise<boolean> {
        return this.recoveryApi.isConfirmed(txHash);
    }

    async getEndpoint(): Promise<string> {
        return await this.recoveryApi.getAxelarGMPApiUrl;
    }
}
