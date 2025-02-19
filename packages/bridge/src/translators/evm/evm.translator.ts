import { ChainType } from "@shared/modules/chain";
import { ITranslator } from "../core/interfaces/i-translator";
import { decodeAccountID } from "xrpl";
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
            const accountId = decodeAccountID(address);
            return `0x${Buffer.from(accountId).toString("hex")}`;
        } else {
            throw new TranslatorError(TranslatorErrors.UNSUPPORTED_CHAIN_TYPE);
        }
    }
}
