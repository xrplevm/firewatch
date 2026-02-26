import { createProtobufRpcClient, ProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import {
    QueryAccountResponse,
    QueryCosmosAccountResponse,
    QueryValidatorAccountResponse,
    QueryBalanceResponse,
    QueryStorageResponse,
    QueryCodeResponse,
    QueryParamsResponse,
} from "./types";
import { encodeQueryParamsRequest, decodeQueryParamsResponse } from "./codec/params";
import { encodeQueryCodeRequest, decodeQueryCodeResponse } from "./codec/code";
import { encodeQueryAccountRequest, decodeQueryAccountResponse } from "./codec/account";
import { encodeQueryBalanceRequest, decodeQueryBalanceResponse } from "./codec/balance";
import { encodeQueryStorageRequest, decodeQueryStorageResponse } from "./codec/storage";

export class EvmQueryClient {
    private readonly rpcClient: ProtobufRpcClient;

    private constructor(rpcClient: ProtobufRpcClient) {
        this.rpcClient = rpcClient;
    }

    /**
     * Creates a new EvmQueryClient instance
     * @param rpcUrl The Tendermint RPC endpoint
     * @returns A Promise that resolves to an EvmQueryClient
     */
    static async connect(rpcUrl: string): Promise<EvmQueryClient> {
        const tendermint = await Tendermint34Client.connect(rpcUrl);
        const queryClient = new QueryClient(tendermint as any);
        const rpcClient = createProtobufRpcClient(queryClient);
        return new EvmQueryClient(rpcClient);
    }

    /**
     * Query an Ethereum account
     * @param address
     */
    async account(address: string): Promise<QueryAccountResponse> {
        const requestData = encodeQueryAccountRequest({ address });
        const responseData = await this.rpcClient.request("ethermint.evm.v1.Query", "Account", requestData) as Uint8Array;
        return decodeQueryAccountResponse(responseData);
    }

    /**
     * Query an Ethereum account's Cosmos Address
     * @param address
     */
    async cosmosAccount(address: string): Promise<QueryCosmosAccountResponse> {
        const data = new Uint8Array();
        return this.rpcClient.request("ethermint.evm.v1.Query", "CosmosAccount", data) as unknown as Promise<QueryCosmosAccountResponse>;
    }

    /**
     * Query an Ethereum account from a validator consensus address
     * @param consAddress
     */
    async validatorAccount(consAddress: string): Promise<QueryValidatorAccountResponse> {
        const data = new Uint8Array();
        return this.rpcClient.request("ethermint.evm.v1.Query", "ValidatorAccount", data) as unknown as Promise<QueryValidatorAccountResponse>;
    }

    /**
     * Query the balance of an Ethereum account
     * @param address
     */
    async balance(address: string): Promise<QueryBalanceResponse> {
        const requestData = encodeQueryBalanceRequest({ address });
        const responseData = await this.rpcClient.request("ethermint.evm.v1.Query", "Balance", requestData) as Uint8Array;
        return decodeQueryBalanceResponse(responseData);
    }

    /**
     * Query account storage
     * @param address
     * @param key
     */
    async storage(address: string, key: string): Promise<QueryStorageResponse> {
        const requestData = encodeQueryStorageRequest({ address, key });
        const responseData = await this.rpcClient.request("ethermint.evm.v1.Query", "Storage", requestData) as Uint8Array;
        return decodeQueryStorageResponse(responseData);
    }

    /**
     * Query account code
     * @param address
     */
    async code(address: string): Promise<QueryCodeResponse> {
        const requestData = encodeQueryCodeRequest({ address });
        const responseData = await this.rpcClient.request("ethermint.evm.v1.Query", "Code", requestData) as Uint8Array;
        return decodeQueryCodeResponse(responseData);
    }

    /**
     * Query the EVM module parameters
     */
    async params(): Promise<QueryParamsResponse> {
        const requestData = encodeQueryParamsRequest({});
        const responseData = await this.rpcClient.request("ethermint.evm.v1.Query", "Params", requestData) as Uint8Array;
        return decodeQueryParamsResponse(responseData);
    }
}
