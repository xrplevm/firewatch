import { Account, accountFromAny } from "@cosmjs/stargate";
import { Any } from "cosmjs-types/google/protobuf/any";
import { parseEthAccount } from "./parser";

/**
 * Custom account parser that extends accountFromAny to support EthAccount format.
 * This parser handles both standard Cosmos accounts and Ethermint EthAccount types.
 *
 * Supports the EthAccount format as defined in ethermint.types.v1:
 * ```proto
 * message EthAccount {
 *   cosmos.auth.v1beta1.BaseAccount base_account = 1;
 *   string code_hash = 2;
 * }
 * ```
 * @param input The Any message containing the account.
 * @returns The parsed account.
 * @throws Error if parsing fails for both EthAccount and standard account formats.
 */
export function ethermintAccountParser(input: Any): Account {
    try {
        // Handle EthAccount specifically
        if (input.typeUrl === "/ethermint.types.v1.EthAccount") {
            const ethAccount = parseEthAccount(input);
            if (ethAccount?.baseAccount) {
                return {
                    address: ethAccount.baseAccount.address,
                    accountNumber: Number(ethAccount.baseAccount.accountNumber),
                    sequence: Number(ethAccount.baseAccount.sequence),
                    pubkey: null, // EthAccount doesn't store pubkey in the account
                } as Account;
            }
            // If EthAccount parsing fails, fall through to standard parsing
        }

        // For all other account types or if EthAccount parsing failed, use standard parsing
        return accountFromAny(input);
    } catch (error) {
        console.error("Failed to parse account with ethermintAccountParser:", error);
        // Final fallback to standard parsing, let it throw if it fails
        return accountFromAny(input);
    }
}

/**
 * Check if an account type URL represents an EthAccount.
 * @param typeUrl The type URL to check.
 * @returns True if the type URL is for an EthAccount.
 */
export function isEthAccount(typeUrl: string): boolean {
    return typeUrl === "/ethermint.types.v1.EthAccount";
}

/**
 * Create an account parser specifically for Ethermint/Evmos chains.
 * This is a factory function that returns a configured account parser.
 * @returns The account parser function.
 */
export function createEthermintAccountParser() {
    return (input: Any): Account => ethermintAccountParser(input);
}
