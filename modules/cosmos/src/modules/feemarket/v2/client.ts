import { StargateClient } from "@cosmjs/stargate";
import { BaseQueryClient } from "../../common/client";
import { FeemarketQueryClient, QueryParamsResponse, QueryBaseFeeResponse, QueryBlockGasResponse } from "@firewatch/proto-evm/feemarket";

export class FeemarketClient extends StargateClient {
    private feemarketQueryClient?: FeemarketQueryClient;

    /**
     * Creates a FeemarketQueryClient instance if not already created.
     * @returns A promise that resolves to the FeemarketQueryClient.
     */
    private async getFeemarketQueryClient(): Promise<FeemarketQueryClient> {
        if (!this.feemarketQueryClient) {
            // We'll need to extract the RPC URL from the BaseQueryClient
            // For now, we'll create a new connection (this could be optimized)
            throw new Error("FeemarketQueryClient initialization not implemented - need RPC URL from BaseQueryClient");
        }
        return this.feemarketQueryClient;
    }

    /**
     * Queries the feemarket module parameters
     * @returns A promise that resolves to the feemarket module parameters
     */
    async getParams(): Promise<QueryParamsResponse> {
        const client = await this.getFeemarketQueryClient();
        return client.params();
    }

    /**
     * Queries the base fee of the parent block of the current block
     * @returns A promise that resolves to the base fee
     */
    async getBaseFee(): Promise<QueryBaseFeeResponse> {
        const client = await this.getFeemarketQueryClient();
        return client.baseFee();
    }

    /**
     * Queries the gas used at a given block height
     * @returns A promise that resolves to the block gas data
     */
    async getBlockGas(): Promise<QueryBlockGasResponse> {
        const client = await this.getFeemarketQueryClient();
        return client.blockGas();
    }

    /**
     * Creates a new FeemarketClient instance connected to the specified RPC URL
     * @param rpcUrl The Tendermint RPC endpoint
     * @returns A Promise that resolves to a FeemarketClient
     */
    static async connect(rpcUrl: string): Promise<FeemarketClient> {
        const baseClient = await BaseQueryClient.connect(rpcUrl);
        const feemarketClient = Object.setPrototypeOf(baseClient, FeemarketClient.prototype) as FeemarketClient;
        feemarketClient.feemarketQueryClient = await FeemarketQueryClient.connect(rpcUrl);
        return feemarketClient;
    }
}
