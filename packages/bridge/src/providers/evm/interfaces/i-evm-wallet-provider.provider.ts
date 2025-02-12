import { IWalletProviderProvider } from "../../core/interfaces/i-wallet-provider.provider";

export interface IEvmWalletProviderProvider extends IWalletProviderProvider {
    /**
     * Checks if a token contract is approved.
     * @param token The token to check.
     * @param owner The owner of the token.
     * @param spender The spender of the token.
     * @returns If the token contract is approved.
     */
    isERC20Approved(token: string, owner: string, spender: string): Promise<boolean>;
}
