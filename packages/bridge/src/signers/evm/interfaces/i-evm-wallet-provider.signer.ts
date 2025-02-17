import { Transaction, Unconfirmed } from "@shared/modules/blockchain";
import { IWalletProviderSigner } from "../../core/interfaces/i-wallet-provider.signer";

export interface IEvmWalletProviderSigner extends IWalletProviderSigner {
    /**
     * Approves an ERC20 token.
     * @param address The address of the ERC20 to approve.
     * @param spender The spender of the ERC20 to approve.
     * @returns The unconfirmed transaction.
     */
    approveERC20(address: string, spender: string): Promise<Unconfirmed<Transaction>>;
}
