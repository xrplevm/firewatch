/**
 * Account type.
 * @example
 * ```typescript
 * const account: Account = {
 *     name: "my-account",
 *     address: "0x1234567890abcdef1234567890abcdef12345678",
 *     privateKey: "0x1234567890abcdef",
 * };
 * ```
 */
export type Account = {
    name: string;
    address: string;
    privateKey: string;
};
