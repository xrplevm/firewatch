export interface IWalletProviderProvider {
    /**
     * Checks if an account is active.
     * @param address The address of the account.
     */
    isAccountActive(address: string): Promise<boolean>;

    /**
     * Gets the native balance of an address as a string integer.
     * @param address The address of the account.
     * @returns The native balance of the account.
     */
    getNativeBalance(address: string): Promise<string>;
}
