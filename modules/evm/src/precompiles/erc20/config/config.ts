import { PrecompileConfig } from "../../common/types/precompile.types";
import { Interface } from "ethers";

export type ERC20PrecompileConfig = PrecompileConfig<{
    interface: Interface;
    amount: string;
    feeFund: string;
}>;
