import { CosmosModule } from "../../models/module";

export interface PoAModule extends CosmosModule {
    validatorsStatus: string;
    stakedAmount: string;
    delegatorPrefix: string;
}
