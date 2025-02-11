import { Wallet } from "xrpl";
import { IXrpWalletProviderProvider } from "../../../interfaces/i-xrp-wallet-provider.provider";

export interface IXrplFaucetWalletProviderProvider extends IXrpWalletProviderProvider {
    /**
     * Generates a funded wallet.
     */
    generateFundedWallet(): Promise<Wallet>;
}
