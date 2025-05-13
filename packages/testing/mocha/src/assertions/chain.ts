import { ChainType } from "@shared/modules/chain";
import { Chain } from "@firewatch/core/chain";
import { Env } from "../../../../env/src/types/env";

/**
 * Validates the chain types of the source and destination chains.
 * @param allowedChainTypes The allowed chain types.
 * @param chain The chain to validate.
 * @returns True if the chain types are valid, false otherwise.
 */
export function isChainType<C extends Chain>(allowedChainTypes: ChainType[], chain: C): boolean {
    return allowedChainTypes.includes(chain.type);
}

/**
 * Validates the environments of the chain.
 * @param allowedEnvironments The allowed environments.
 * @param chain The chain to validate.
 * @returns True if the environments are valid, false otherwise.
 */
export function isChainEnvironment<C extends Chain>(allowedEnvironments: Env[], chain: C): boolean {
    return allowedEnvironments.includes(chain.env);
}
