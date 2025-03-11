import { ERC20PrecompileConfig } from "../../precompiles/erc20/config/config";
import { HardhatModuleConfig } from "@testing/hardhat/config";
import { Chain } from "@firewatch/core/chain";
import { Account } from "@firewatch/core/account";

export interface EVMModuleConfig extends Omit<HardhatModuleConfig<Chain, Account>, "network" | "accounts"> {
    erc20: ERC20PrecompileConfig;
}
