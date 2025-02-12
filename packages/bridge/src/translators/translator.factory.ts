import { ChainType } from "@shared/modules/chain";
import { Chain } from "@firewatch/core/chain";
import { ITranslator } from "./core/interfaces/i-translator";
import { EvmTranslator } from "./evm/evm.translator";
import { XrpTranslator } from "./xrp/xrp.translator";

/**
 * TranslatorFactory is a function that returns a translator based on the chain type.
 * @param chain The chain to get the translator for.
 * @returns The translator for the chain.
 */
export function TranslatorFactory(chain: Chain): ITranslator {
    switch (chain.type) {
        case ChainType.EVM:
            return new EvmTranslator();
        case ChainType.XRP:
            return new XrpTranslator();
        default:
            throw new Error(`Chain ${chain.type} not supported`);
    }
}
