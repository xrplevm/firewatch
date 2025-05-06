import { AxelarGMPRecoveryAPI, Environment, GMPStatusResponse } from "@axelar-network/axelarjs-sdk";
import { AxelarCallInfo, LifecycleInfo } from "./axelar.provider.types";
import { toSdkEnv } from "./helpers";
import { Env } from "@firewatch/env/types";

export class AxelarProvider {
    private recoveryApi: AxelarGMPRecoveryAPI;

    constructor(environment: Env) {
        this.recoveryApi = new AxelarGMPRecoveryAPI({ environment: toSdkEnv(environment) });
    }

    /**
     * @inheritdoc
     */
    async getLifecycleInfo(txHash: string): Promise<LifecycleInfo> {
        const full = await this.recoveryApi.queryTransactionStatus(txHash);
        const { status, error, executed, expressExecuted, approved, callback } = full;
        return { status, error, executed, expressExecuted, approved, callback };
    }

    /**
     * @inheritdoc
     */
    async getFullStatus(txHash: string): Promise<GMPStatusResponse> {
        return this.recoveryApi.queryTransactionStatus(txHash);
    }

    /**
     * @inheritdoc
     */
    async getCallInfo(txHash: string): Promise<AxelarCallInfo> {
        const { callTx } = await this.recoveryApi.queryTransactionStatus(txHash);
        return callTx;
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
}
