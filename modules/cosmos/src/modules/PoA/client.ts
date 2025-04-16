import { StargateClient } from "@cosmjs/stargate";
import { Validator } from "cosmjs-types/cosmos/staking/v1beta1/staking";
import { QueryClientImpl as StakingQueryClient } from "cosmjs-types/cosmos/staking/v1beta1/query";
import { PoAModule } from "./module";

// Define a minimal Rpc interface (what StakingQueryClient expects)
interface Rpc {
    request(service: string, method: string, data: Uint8Array): Promise<Uint8Array>;
}

/**
 * PoAClient extends StargateClient and adds custom staking query methods.
 */
export class PoAClient extends StargateClient {
    public readonly stakingService: StakingQueryClient;
    private readonly moduleConfig: PoAModule;

    private constructor(cometClient: any, stakingService: StakingQueryClient, moduleConfig: PoAModule) {
        // Pass an empty object as options.
        super(cometClient, {});
        this.stakingService = stakingService;
        this.moduleConfig = moduleConfig;
    }

    /**
     * Static async factory method that creates a PoAClient instance.
     * @param rpcUrl - The Cosmos RPC endpoint.
     * @param moduleConfig - The PoA module configuration (includes validatorsStatus).
     * @returns A fully initialized PoAClient.
     */
    static async createPoAClient(rpcUrl: string, moduleConfig: PoAModule): Promise<PoAClient> {
        const client = await StargateClient.connect(rpcUrl);

        const rpc = (client as any).rpc as Rpc;
        if (!rpc || typeof rpc.request !== "function") {
            throw new Error("Unable to extract rpc from StargateClient");
        }

        const stakingService = new StakingQueryClient(rpc);
        const cometClient = (client as any).cometClient;

        return new PoAClient(cometClient, stakingService, moduleConfig);
    }

    /**
     * Queries and returns all validators from the staking module.
     * @returns A promise that resolves to an array of Validator objects.
     */
    async getValidators(): Promise<Validator[]> {
        const response = await this.stakingService.Validators({
            status: this.moduleConfig.validatorsStatus,
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
    async getValidatorSelfDelegationShare(validatorAddress: string): Promise<string> {
        const response = await this.stakingService.Delegation({
            delegatorAddr: validatorAddress,
            validatorAddr: validatorAddress,
        });
        return response.delegationResponse ? response.delegationResponse.delegation.shares : "0";
    }
}
