import { ChainType } from "../../../../common";
import { TrustClaimTransaction, Unconfirmed } from "../../../../transaction/types";
import { XChainWalletSigner } from "../../../interfaces";

export interface XrpXChainWalletSigner extends XChainWalletSigner<ChainType.XRP> {
    /**
     * Sets a trust line with the issuer and currency pair.
     * @param issuer The issuer of the token.
     * @param currencyCode The currency of the token in any format.
     * @param limitAmount The limit amount of the trust line.
     */
    setTrustLine(issuer: string, currency: string, limitAmount?: string): Promise<Unconfirmed<TrustClaimTransaction>>;
}
