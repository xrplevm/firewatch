import { StargateClient } from "@cosmjs/stargate";
import { BaseQueryClient } from "../../common/client";
import { EvmQueryClient, QueryAccountResponse, QueryParamsResponse } from "@firewatch/proto-evm";
import { Buffer } from "buffer";

export class EvmClient extends StargateClient {
    private evmQueryClient?: EvmQueryClient;

    /**
     * Creates an EvmQueryClient instance if not already created
     */
    private async getEvmQueryClient(): Promise<EvmQueryClient> {
        if (!this.evmQueryClient) {
            // We'll need to extract the RPC URL from the BaseQueryClient
            // For now, we'll create a new connection (this could be optimized)
            throw new Error("EvmQueryClient initialization not implemented - need RPC URL from BaseQueryClient");
        }
        return this.evmQueryClient;
    }

    /**
     * Queries the EVM module parameters
     * @returns A promise that resolves to the EVM module parameters
     */
    async getParams(): Promise<QueryParamsResponse> {
        const client = await this.getEvmQueryClient();
        return client.params();
    }

    /**
     * Queries the EVM module code
     * @param address The address to query the code for
     * @returns A promise that resolves to the EVM module code
     */
    async getCode(address: string): Promise<string | null> {
        const client = await this.getEvmQueryClient();
        const codeBytes = await client.code(address);
        return !!codeBytes.code?.length ? Buffer.from(codeBytes.code).toString("hex") : null;
    }

    async getAccountObject(address: string): Promise<QueryAccountResponse> {
        const client = await this.getEvmQueryClient();
        return client.account(address);
    }

    /**
     * Creates a new EvmClient instance connected to the specified RPC URL
     * @param rpcUrl The Tendermint RPC endpoint
     * @returns A Promise that resolves to an EvmClient
     */
    static async connect(rpcUrl: string): Promise<EvmClient> {
        const baseClient = await BaseQueryClient.connect(rpcUrl);
        const evmClient = Object.setPrototypeOf(baseClient, EvmClient.prototype) as EvmClient;
        evmClient.evmQueryClient = await EvmQueryClient.connect(rpcUrl);
        return evmClient;
    }
}
