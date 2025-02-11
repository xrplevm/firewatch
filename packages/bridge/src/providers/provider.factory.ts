import { ChainType } from "@shared/modules/chain";
import { EthersProvider } from "./evm/ethers";
import { providers } from "ethers";
import { XrplProvider } from "./xrp/xrpl";
import { Client } from "xrpl";
import { IProvider } from "./core/interfaces";
import { Chain } from "../models/core/chain";

/**
 * ProviderFactory is a function that returns a provider based on the chain type.
 * @param chain The chain to get the provider for.
 * @returns The provider for the chain.
 */
export function ProviderFactory(chain: Chain): IProvider {
    switch (chain.type) {
        case ChainType.EVM:
            return new EthersProvider(new providers.JsonRpcProvider(chain.urls.rpc!));
        case ChainType.XRP:
            return new XrplProvider(new Client(chain.urls.ws!));
        default:
            throw new Error(`Chain ${chain.type} not supported`);
    }
}
