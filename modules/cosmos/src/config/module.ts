import { Account } from "@firewatch/core/account";
import { ModuleConfig } from "@firewatch/core/module";
import { CosmosChain } from "../models/chain";

export interface CosmosModuleConfig extends Omit<ModuleConfig<CosmosChain, Account>, "network" | "accounts"> {
    cosmos: {
        url: string;
        chain: CosmosChain;
    };
}
