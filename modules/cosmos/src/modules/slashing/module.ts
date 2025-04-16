import { CosmosModule } from "../../models/module";

export interface SlashingModule extends CosmosModule {
    downtimeFraction: string;
    doubleSignerFraction: string;
}
