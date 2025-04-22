import { Account } from "@firewatch/core/account";
import { ModuleConfig } from "@firewatch/core/module";
import { Chain } from "@firewatch/core/chain";
import { BankModuleConfig } from "../modules/bank/config";

export interface CosmosModuleConfig extends Omit<ModuleConfig<Chain, Account>, "accounts" | "door"> {
    bank: BankModuleConfig;
}
