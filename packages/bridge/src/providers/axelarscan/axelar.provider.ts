import { AxelarGMPRecoveryAPI, Environment, GMPStatusResponse, GMPStatus } from "@axelar-network/axelarjs-sdk";
import { LifecycleInfo } from "./axelar.provider.types";

export class AxelarSdkProvider {
    private recoveryApi: AxelarGMPRecoveryAPI;

    constructor(environment: Environment) {
        this.recoveryApi = new AxelarGMPRecoveryAPI({ environment });
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
    async getCallInfo(txHash: string): Promise<any> {
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
