import { Token } from "@firewatch/core/token";

/**
 * Interface for providers.
 * Includes methods that are common to all providers and will be used in the domain layer (by a controller).
 * Other provider interfaces are meant to be used in a specific context (e.g. wallet provider, bridge door, etc.).
 */
export interface IProvider {
    /**
     * Gets the token balance.
     * @param address The address of the account.
     * @param token The token.
     * @returns The balance.
     */
    getTokenBalance(address: string, token: Token): Promise<string>;
}
