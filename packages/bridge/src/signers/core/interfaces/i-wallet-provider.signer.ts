import { Transaction, Unconfirmed } from "@shared/modules/blockchain";
import { Token } from "@firewatch/core/token";

export interface IWalletProviderSigner {
    /**
     * Gets the wallet address.
     * @returns The wallet address.
     */
    getAddress(): Promise<string>;

    /**
     * Transfers a token to the specified destination chain and address.
     * @param amount The amount to transfer.
     * @param token The token to transfer.
     * @param doorAddress The door address.
     * @param destinationChainId The destination chain id.
     * @param destinationAddress The destination address.
     * @returns The unconfirmed transaction.
     */
    transfer(
        amount: string,
        token: Token,
        doorAddress: string,
        destinationChainId: string,
        destinationAddress: string,
    ): Promise<Unconfirmed<Transaction>>;

    /**
     * Calls a contract on the destination chain.
     * @param amount The amount of tokens to include in the call.
     * @param token The token used for the call.
     * @param sourceGatewayAddress The source gateway address.
     * @param destinationChainId The destination chain id.
     * @param destinationContractAddress The destination contract address.
     * @param payload The payload.
     * @returns The transaction.
     */
    callContract(
        amount: string,
        token: Token,
        sourceGatewayAddress: string,
        destinationChainId: string,
        destinationContractAddress: string,
        payload: string,
    ): Promise<Unconfirmed<Transaction>>;
}
