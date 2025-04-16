import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { Validator } from "cosmjs-types/cosmos/staking/v1beta1/staking";
import { QueryValidatorDelegationsResponse, QueryClientImpl as StakingQueryClient } from "cosmjs-types/cosmos/staking/v1beta1/query";
import { QueryClientImpl as SlashingQueryClient } from "cosmjs-types/cosmos/slashing/v1beta1/query";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";

/**
 * PoAClient extends StargateClient and adds custom staking query methods.
 */
// The PoAClient will use composition rather than inheritance.
export class PoAClient {
    public readonly stakingQuery: StakingQueryClient;

    private constructor(stakingQuery: StakingQueryClient) {
        this.stakingQuery = stakingQuery;
    }

    /**
     * Static async factory method to create a PoAClient instance.
     * @param rpcUrl - The Tendermint RPC endpoint URL.
     * @returns A Promise that resolves to a fully initialized PoAClient.
     */
    static async connect(rpcUrl: string): Promise<PoAClient> {
        const tendermint = await Tendermint34Client.connect(rpcUrl);
        const queryClient = new QueryClient(tendermint as any);
        const rpcClient = createProtobufRpcClient(queryClient);
        const stakingQuery = new StakingQueryClient(rpcClient);

        return new PoAClient(stakingQuery);
    }

    /**
     * Queries and returns all validators from the staking module.
     * @returns A promise that resolves to an array of Validator objects.
     */
    async getValidators(): Promise<Validator[]> {
        const response = await this.stakingQuery.Validators({ status: "" });
        return response.validators;
    }

    /**
     * Retrieves all delegations for the given validator.
     * This method calls the ValidatorDelegations query and returns the full response.
     * @param validatorAddress The validator operator address.
     * @returns A promise that resolves to the QueryValidatorDelegationsResponse.
     */
    async getValidatorDelegations(validatorAddress: string): Promise<QueryValidatorDelegationsResponse> {
        const response = await this.stakingQuery.ValidatorDelegations({
            validatorAddr: validatorAddress,
        });
        return response;
    }
}
