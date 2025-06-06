import { Validator } from "cosmjs-types/cosmos/staking/v1beta1/staking";
import { QueryValidatorDelegationsResponse, QueryClientImpl as StakingQueryClient } from "cosmjs-types/cosmos/staking/v1beta1/query";
import { BaseQueryClient } from "../common/client";

/**
 * PoaClient extends StargateClient and adds custom staking query methods.
 */
// The PoaClient will use composition rather than inheritance.
export class PoaClient {
    readonly stakingQuery: StakingQueryClient;

    private constructor(stakingQuery: StakingQueryClient) {
        this.stakingQuery = stakingQuery;
    }

    /**
     * Static async factory method to create a PoaClient instance.
     * @param rpcUrl The Tendermint RPC endpoint URL.
     * @returns A Promise that resolves to a fully initialized PoaClient.
     */
    static async connect(rpcUrl: string): Promise<PoaClient> {
        const baseClient = await BaseQueryClient.connect(rpcUrl);
        const slashingQuery = new StakingQueryClient(baseClient.rpcClient);
        return new PoaClient(slashingQuery);
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
