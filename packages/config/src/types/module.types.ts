import { Env } from "../../../env/src/types/env";

/**
 * Network type.
 * @example
 * ```typescript
 * const network: Network = {
 *     name: "mainnet",
 *     env: "mainnet",
 *     chainId: 1,
 *     rpcUrl: "https://mainnet.infura.io/v3/your-infura-key",
 * };
 * ```
 */
export type Network = {
    name: string;
    env: Env;
    chainId: number;
    rpcUrl: string;
};

/**
 * Account type.
 * @example
 * ```typescript
 * const account: Account = {
 *     name: "my-account",
 *     privateKey: "0x1234567890abcdef",
 * };
 * ```
 */
export type Account = {
    name: string;
    privateKey: string;
};

/**
 * Config type.
 * @example
 * ```typescript
 * const config: Config<Network, Account> = {
 *     network: {
 *         name: "mainnet",
 *         env: "mainnet",
 *         chainId: 1,
 *         rpcUrl: "https://mainnet.infura.io/v3/your-infura-key",
 *     },
 *     accounts: [
 *         {
 *             name: "my-account",
 *             privateKey: "0x1234567890abcdef",
 *         },
 *     ],
 * };
 * ```
 */
export type Config<N extends Network, A extends Account> = {
    network: N;
    accounts: A[];
};
