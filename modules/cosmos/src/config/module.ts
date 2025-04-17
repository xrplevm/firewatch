import { Account } from "@firewatch/core/account";
import { ModuleConfig } from "@firewatch/core/module";
import { Chain } from "@firewatch/core/chain";
import { BankModule } from "../modules/bank/module";

export interface CosmosModuleConfig extends Omit<ModuleConfig<Chain, Account>, "network" | "accounts"> {
    chain: Chain;
    modules: SubModulesObject;
}

export type SubModulesObject = {
    bank: BankModule;
};
