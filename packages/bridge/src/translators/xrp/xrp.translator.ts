import { ChainType } from "@shared/modules/chain";
import { ITranslator } from "../core/interfaces/i-translator";
import { convertStringToHex } from "xrpl";
import { TranslatorError } from "../core/error/translator.error";
import { TranslatorErrors } from "../core/error/translator.errors";

export class XrpTranslator implements ITranslator {
    /**
     * @inheritdoc
     */
    translate(chainType: ChainType, address: string): string {
        if (chainType === ChainType.XRP) {
            return address;
        } else if (chainType === ChainType.EVM) {
            const formattedAddress = address.startsWith("0x") ? address.slice(2) : address;
            return convertStringToHex(formattedAddress);
        } else {
            throw new TranslatorError(TranslatorErrors.UNSUPPORTED_CHAIN_TYPE);
        }
    }
}
