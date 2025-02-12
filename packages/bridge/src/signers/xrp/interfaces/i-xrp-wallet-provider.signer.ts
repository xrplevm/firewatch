import { Transaction, Unconfirmed } from "@shared/modules/blockchain";
import { IWalletProviderSigner } from "../../core/interfaces/i-wallet-provider.signer";

export interface IXrpWalletProviderSigner extends IWalletProviderSigner {
    /**
     * Sets a trust line with the issuer and currency pair.
     * @param issuer The issuer of the token.
     * @param currency The currency of the token in any format.
     * @param limitAmount The limit amount of the trust line.
     */
    setTrustLine(issuer: string, currency: string, limitAmount?: string): Promise<Unconfirmed<Transaction>>;
}
