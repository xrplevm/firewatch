import { Account } from "@firewatch/core/account";
import { ModuleConfig } from "@firewatch/core/module";
import { Chain } from "@firewatch/core/chain";
import { BankModule } from "../modules/bank/module";
import { PoAModule } from "../modules/PoA/module";
import { SlashingModule } from "../modules/slashing/module";

export interface CosmosModuleConfig extends Omit<ModuleConfig<Chain, Account>, "network" | "accounts"> {
    chain: Chain;
    modules: SubModulesObject;
}

export type SubModulesObject = {
    bank: BankModule;
    poa: PoAModule;
    slashing: SlashingModule;
};
