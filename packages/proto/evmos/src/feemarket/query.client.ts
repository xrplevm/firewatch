import { createProtobufRpcClient, ProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import {
    QueryParamsResponse,
    QueryBaseFeeResponse,
    QueryBlockGasResponse,
} from "./types";
import { encodeQueryParamsRequest, decodeQueryParamsResponse } from "./codec/params";
import { encodeQueryBaseFeeRequest, decodeQueryBaseFeeResponse } from "./codec/baseFee";
import { encodeQueryBlockGasRequest, decodeQueryBlockGasResponse } from "./codec/blockGas";

export class FeemarketQueryClient {
    private readonly rpcClient: ProtobufRpcClient;

    private constructor(rpcClient: ProtobufRpcClient) {
        this.rpcClient = rpcClient;
    }

    /**
     * Creates a new FeemarketQueryClient instance
     * @param rpcUrl The Tendermint RPC endpoint
     * @returns A Promise that resolves to a FeemarketQueryClient
     */
    static async connect(rpcUrl: string): Promise<FeemarketQueryClient> {
        const tendermint = await Tendermint34Client.connect(rpcUrl);
        const queryClient = new QueryClient(tendermint as any);
        const rpcClient = createProtobufRpcClient(queryClient);
        return new FeemarketQueryClient(rpcClient);
    }

    /**
     * Query the feemarket module parameters
     */
    async params(): Promise<QueryParamsResponse> {
        const requestData = encodeQueryParamsRequest({});
        const responseData = await this.rpcClient.request("ethermint.feemarket.v1.Query", "Params", requestData) as Uint8Array;
        return decodeQueryParamsResponse(responseData);
    }

    /**
     * Query the base fee of the parent block of the current block
     */
    async baseFee(): Promise<QueryBaseFeeResponse> {
        const requestData = encodeQueryBaseFeeRequest({});
        const responseData = await this.rpcClient.request("ethermint.feemarket.v1.Query", "BaseFee", requestData) as Uint8Array;
        return decodeQueryBaseFeeResponse(responseData);
    }

    /**
     * Query the gas used at a given block height
     */
    async blockGas(): Promise<QueryBlockGasResponse> {
        const requestData = encodeQueryBlockGasRequest({});
        const responseData = await this.rpcClient.request("ethermint.feemarket.v1.Query", "BlockGas", requestData) as Uint8Array;
        return decodeQueryBlockGasResponse(responseData);
    }
}
