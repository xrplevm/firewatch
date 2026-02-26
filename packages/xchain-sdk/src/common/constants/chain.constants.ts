import { ChainType } from "../types";
import { EVM_DECIMALS } from "./evm.constants";
import { XRP_DECIMALS } from "./xrp.constants";

export const CHAIN_DECIMALS: Record<ChainType, number> = {
    [ChainType.EVM]: EVM_DECIMALS,
    [ChainType.XRP]: XRP_DECIMALS,
};
