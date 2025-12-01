import { ChainType } from "../../../../common/types";
import { XChainWalletProvider } from "../../../interfaces";

export interface XrpXChainWalletProvider extends XChainWalletProvider<ChainType.XRP> {
    /**
     * Checks if an account has a trust line with the issuer and currency pair.
     * @param address The address of the account.
     * @param issuer The issuer of the token.
     * @param currency The currency of the token.
     */
    accountHasTrustLine(address: string, issuer: string, currency: string): Promise<boolean>;
}
