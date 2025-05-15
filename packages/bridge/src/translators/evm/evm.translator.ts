import { ChainType } from "@shared/modules/chain";
import { ITranslator } from "../core/interfaces/i-translator";
import { convertStringToHex } from "xrpl";
import { TranslatorError } from "../core/error/translator.error";
import { TranslatorErrors } from "../core/error/translator.errors";

export class EvmTranslator implements ITranslator {
    /**
     * @inheritdoc
     */
    translate(chainType: ChainType, address: string): string {
        if (chainType === ChainType.EVM) {
            return address;
        } else if (chainType === ChainType.XRP) {
            console.log("address", address);
            const clean = address.startsWith("0x") ? address.slice(2) : address;
            return `0x${convertStringToHex(clean)}`;
        } else {
            throw new TranslatorError(TranslatorErrors.UNSUPPORTED_CHAIN_TYPE);
        }
    }
}
