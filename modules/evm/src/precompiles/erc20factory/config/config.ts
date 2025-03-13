import { PrecompileConfig } from "../../common/types/precompile.types";
import { Interface } from "ethers";

export type ERC20FactoryPrecompileConfig = PrecompileConfig<{
    interface: Interface;
}>;
