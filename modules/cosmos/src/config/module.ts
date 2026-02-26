import { Account } from "@firewatch/core/account";
import { ModuleConfig } from "@firewatch/core/module";
import { Chain } from "@firewatch/core/chain";
import { BankModuleConfig } from "../modules/bank/config";
import { PoaModuleConfig } from "../modules/poa/config";
import { SlashingModuleConfig } from "../modules/slashing/config";
import { EvmModuleConfig } from "../modules/evm/v2/config";

export interface CosmosModuleConfig extends Omit<ModuleConfig<Chain, Account>, "accounts" | "door"> {
    bank: BankModuleConfig;
    poa: PoaModuleConfig;
    slashing: SlashingModuleConfig;
    evmv2: EvmModuleConfig;
}
