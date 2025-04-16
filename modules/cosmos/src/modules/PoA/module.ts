import { CosmosModule } from "../../models/module";

export interface PoAModule extends CosmosModule {
    stakedAmount: string;
}
