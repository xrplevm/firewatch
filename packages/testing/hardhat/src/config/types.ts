import { HardhatConfig } from "hardhat/types";
import { ModuleConfig } from "@firewatch/core/module";
import { Chain } from "@firewatch/core/chain";
import { Account } from "@firewatch/core/account";

export type HardhatModuleConfig<N extends Chain, A extends Account> = {
    hardhat: HardhatConfig;
} & ModuleConfig<N, A>;
