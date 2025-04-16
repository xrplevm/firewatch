import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { QueryClient, createProtobufRpcClient, ProtobufRpcClient } from "@cosmjs/stargate";

export class BaseQueryClient {
    readonly rpcClient: ProtobufRpcClient;

    private constructor(rpcClient: ProtobufRpcClient) {
        this.rpcClient = rpcClient;
    }

    /**
     * Connects to the given RPC URL and returns a BaseQueryClient instance.
     * @param rpcUrl The Tendermint RPC endpoint.
     * @returns A Promise that resolves to a BaseQueryClient.
     */
    static async connect(rpcUrl: string): Promise<BaseQueryClient> {
        const tendermint = await Tendermint34Client.connect(rpcUrl);
        const queryClient = new QueryClient(tendermint as any);
        const rpcClient = createProtobufRpcClient(queryClient);
        return new BaseQueryClient(rpcClient);
    }
}
