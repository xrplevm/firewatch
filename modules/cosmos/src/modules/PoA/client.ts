import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { Validator } from "cosmjs-types/cosmos/staking/v1beta1/staking";
import { QueryValidatorDelegationsResponse, QueryClientImpl as StakingQueryClient } from "cosmjs-types/cosmos/staking/v1beta1/query";
import { PoAModule } from "./module";
import {
    QueryClientImpl as SlashingQueryClient,
    QueryParamsResponse as SlashingParamsResponse,
} from "cosmjs-types/cosmos/slashing/v1beta1/query";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { fromBech32, toBech32 } from "@cosmjs/encoding";

// Define a minimal Rpc interface (what StakingQueryClient expects)
interface Rpc {
    request(service: string, method: string, data: Uint8Array): Promise<Uint8Array>;
}

/**
 * PoAClient extends StargateClient and adds custom staking query methods.
 */
// The PoAClient will use composition rather than inheritance.
export class PoAClient {
    public readonly stakingQuery: StakingQueryClient;
    public readonly slashingQuery: SlashingQueryClient;
    private readonly moduleConfig: PoAModule;

    private constructor(stakingQuery: StakingQueryClient, slashingQuery: SlashingQueryClient, moduleConfig: PoAModule) {
        this.stakingQuery = stakingQuery;
        this.slashingQuery = slashingQuery;
        this.moduleConfig = moduleConfig;
    }

    /**
     * Static async factory method to create a PoAClient instance.
     * @param rpcUrl - The Tendermint RPC endpoint URL.
     * @param moduleConfig - The PoA module configuration (e.g. includes validatorsStatus).
     * @returns A Promise that resolves to a fully initialized PoAClient.
     */
    static async connect(rpcUrl: string, moduleConfig: PoAModule): Promise<PoAClient> {
        const tendermint = await Tendermint34Client.connect(rpcUrl);
        const queryClient = new QueryClient(tendermint as any);
        const rpcClient = createProtobufRpcClient(queryClient);
        const stakingQuery = new StakingQueryClient(rpcClient);
        const slashingQuery = new SlashingQueryClient(rpcClient);

        return new PoAClient(stakingQuery, slashingQuery, moduleConfig);
    }

    /**
     * Queries and returns all validators from the staking module.
     * @returns A promise that resolves to an array of Validator objects.
     */
    async getValidators(): Promise<Validator[]> {
        const response = await this.stakingQuery.Validators({
            status: this.moduleConfig.validatorsStatus, // e.g., "BOND_STATUS_BONDED"
        });
        return response.validators;
    }

    /**
     * Retrieves the self-delegation share for a given validator.
     * In Cosmos, a validator’s self-delegation is the delegation where
     * the delegator's address equals the validator's operator address.
     * @param validatorAddress The operator address of the validator.
     * @returns A promise that resolves to the delegation shares as a string.
     */
    async getValidatorSelfDelegationShare(validatorAddress: string, delegatorPrefix: string): Promise<string> {
        const delegatorAddress = convertValidatorToDelegatorAddress(validatorAddress, delegatorPrefix);
        const response = await this.stakingQuery.Delegation({
            delegatorAddr: delegatorAddress,
            validatorAddr: validatorAddress,
        });
        return response.delegationResponse ? response.delegationResponse.delegation.shares : "0";
    }

    /**
     * Retrieves all delegations for the given validator.
     *
     * This method calls the ValidatorDelegations query and returns the full response.
     *
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

/**
 * Helper function to convert a validator operator address to a delegator address.
 * This version decodes the validator address using fromBech32 and then re-encodes it with the delegator prefix.
 */
export function convertValidatorToDelegatorAddress(validatorAddress: string, delegatorPrefix: string): string {
    const decoded = fromBech32(validatorAddress);
    return toBech32(delegatorPrefix, new Uint8Array(decoded.data));
}
