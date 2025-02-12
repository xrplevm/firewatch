import { IEvmWalletProviderSigner } from "../../../interfaces/i-evm-wallet-provider.signer";
import { Chain } from "@firewatch/core/chain";

export interface IWeb3Signer extends IEvmWalletProviderSigner {
    /**
     * Adds a listener for the `accountsChanged` event
     * @param handler onAccountsChange handler
     */
    onAccountsChange(handler: (address: string[]) => void): () => void;

    /**
     * Adds a listener for the `chainChanged` event
     * @param handler onChainChange handler
     */
    onChainChange(handler: (chainId: string) => void): () => void;

    /**
     * Sets the chain for the web3 signer
     * @param chain The chain to set
     */
    setChain(chain: Chain): void;

    /**
     * Sets the chain for the web3 signer and connects to the chain
     * @param chain The chain to set
     */
    setChainAndConnect(chain: Chain): Promise<void>;
}
