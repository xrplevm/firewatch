import { ChainType } from "@shared/modules/chain";
import { IWalletProviderSigner } from "@firewatch/bridge/signers/interfaces";

export interface ISignerService<T extends IWalletProviderSigner = IWalletProviderSigner> {
    /**
     * Acquires a signer for the specified blockchain.
     * @param chain The type of blockchain to acquire a signer for.
     * @returns A promise that resolves to an available signer for the specified chain, or null if none available.
     */
    acquireSigner(chain: ChainType): Promise<T | null>;

    /**
     * Releases a previously acquired signer, marking it as available for future use.
     * @param signer The wallet provider signer to release.
     * @returns A promise that resolves when the signer is successfully released.
     */
    releaseSigner(signer: T): Promise<void>;

    /**
     * Loads multiple signers from private keys or seeds into the service.
     * @param privateKeys Array of private keys or seeds to create signers from.
     * @returns A promise that resolves when all signers are successfully loaded.
     */
    loadSigners(privateKeys: string[]): Promise<void>;
}
