import { Chain, ChainObject } from "@firewatch/core/chain";
import { HardhatConfig } from "hardhat/types";

export interface ERC20ContractConfig {
    abi: string[];
    contractAddress: string;
    owner: string;
    amount: string;
    burnAmount: string;
    faucetFund: string;
}

export interface ContractsConfig {
    erc20: ERC20ContractConfig;
}

export interface EVMModuleConfig {
    hardhat: HardhatConfig;
    contracts: ContractsConfig;
    chain: ChainObject;
}
