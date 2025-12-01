import { IssuedCurrency } from "xrpl";
import { ChainType } from "../common";

export type XChainTokenFormats = {
    xrp: IssuedCurrency;
    evm: string;
};

export type XChainTokenFormat<T extends ChainType> = XChainTokenFormats[T];
