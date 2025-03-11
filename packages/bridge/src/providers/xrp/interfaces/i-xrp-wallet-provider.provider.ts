import { IWalletProviderProvider } from "../../core/interfaces/i-wallet-provider.provider";

export interface IXrpWalletProviderProvider extends IWalletProviderProvider {
    /**
     * Checks if an account has a trust line with the issuer and currency pair.
     * @param address The address of the account.
     * @param issuer The issuer of the token.
     * @param currency The currency of the token.
     * @returns Whether the account has a trust line with the issuer and currency pair.
     */
    accountHasTrustLine(address: string, issuer: string, currency: string): Promise<boolean>;
}
