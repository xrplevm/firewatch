import { PrecompileConfig } from "../types/precompile.types";
import { Interface } from "ethers";
import erc20Config from "../erc20.config.json";

export type ERC20PrecompileConfig = PrecompileConfig<{
    interface: Interface;
    amount: string;
    feeFund: string;
}>;

export const erc20PrecompileConfig: ERC20PrecompileConfig = {
    abi: erc20Config.abi,
    interface: new Interface(erc20Config.abi),
    contractAddress: erc20Config.contractAddress,
    amount: erc20Config.amount,
    feeFund: erc20Config.feeFund,
};
