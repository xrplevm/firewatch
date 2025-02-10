import { HardhatConfig } from "hardhat/types";
import { Network, Account, Config } from "@firewatch/config/types";

export type HardhatModuleConfig<N extends Network, A extends Account> = {
    hardhat: HardhatConfig;
} & Config<N, A>;
