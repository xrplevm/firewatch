import { ChainType } from "@shared/modules/chain";

export interface ITranslator {
    /**
     * Translate an address from one chain type to another.
     * @param chainType The chain type to translate.
     * @param address The address to translate.
     * @returns The translated address.
     */
    translate(chainType: ChainType, address: string): string;
}
