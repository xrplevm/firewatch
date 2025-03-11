import { Account } from "../account";
import { Chain } from "../chain";

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
export type ModuleConfig<N extends Chain, A extends Account> = {
    network: N;
    accounts: A[];
};
