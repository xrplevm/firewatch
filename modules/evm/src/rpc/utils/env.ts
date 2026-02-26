/**
 * Gets RPC username from environment variable.
 * @param networkName The network name (e.g., 'xrplevm_testnet', 'xrplevm_devnet')
 * @returns The username if set, undefined otherwise
 */
export function getRpcUsername(networkName: string): string | undefined {
    // Convert network name to uppercase and replace hyphens with underscores
    // e.g., 'xrplevm_testnet' -> 'XRPLEVM_TESTNET'
    const envKey = `${networkName.toUpperCase().replace(/-/g, "_")}_RPC_USERNAME`;
    return process.env[envKey];
}

/**
 * Gets RPC password from environment variable.
 * @param networkName The network name (e.g., 'xrplevm_testnet', 'xrplevm_devnet')
 * @returns The password if set, undefined otherwise
 */
export function getRpcPassword(networkName: string): string | undefined {
    // Convert network name to uppercase and replace hyphens with underscores
    // e.g., 'xrplevm_testnet' -> 'XRPLEVM_TESTNET'
    const envKey = `${networkName.toUpperCase().replace(/-/g, "_")}_RPC_PASSWORD`;
    return process.env[envKey];
}

/**
 * Gets RPC credentials from environment variables.
 * @param networkName The network name (e.g., 'xrplevm_testnet', 'xrplevm_devnet')
 * @returns An object with username and password, or undefined if not set
 */
export function getRpcCredentials(networkName: string): { username: string; password: string } | undefined {
    const username = getRpcUsername(networkName);
    const password = getRpcPassword(networkName);

    if (username && password) {
        return { username, password };
    }

    return undefined;
}
