import { NetworkType } from "./types";

/**
 * Gets the network type of a chain.
 * @param value The chain name.
 * @returns The network type of the chain.
 */
export function getNetworkType(value: string): NetworkType {
    if (isTestnet(value)) {
        return NetworkType.TESTNET;
    } else if (isDevnet(value)) {
        return NetworkType.DEVNET;
    } else {
        return NetworkType.MAINNET;
    }
}

/**
 * Checks if the given chain is a testnet.
 * @param value The chain name.
 * @returns Whether the chain is a testnet.
 */
export function isTestnet(value: string): boolean {
    return value.toLowerCase().includes("testnet");
}

/**
 * Checks if the given chain is a devnet.
 * @param value The chain name.
 * @returns Whether the chain is a devnet.
 */
export function isDevnet(value: string): boolean {
    return value.toLowerCase().includes("devnet");
}

/**
 * Checks if the given chain is a mainnet.
 * @param value The chain name.
 * @returns Whether the chain is a mainnet.
 */
export function isMainnet(value: string): boolean {
    return !isTestnet(value) && !isDevnet(value);
}

/**
 * Normalizes a chain name by removing testnet and devnet from it.
 * @example "XRPL Devnet" -> "XRPL"
 * @param name The full name of the chain.
 * @returns The normalized name of the chain.
 */
export function normalizeChainName(name: string): string {
    return (
        name
            // Replace exactly testnet and devnet
            .replace(/\b(testnet|devnet)\b/gi, "")
            // Replace starting or ending white spaces (i.e. "* Testnet" or "Testnet *")
            .replace(/(^ )|( $)/, "")
            // Replace multiple white spaces with a single one (i.e. "* Testnet *")
            .replace("  ", " ")
    );
}
