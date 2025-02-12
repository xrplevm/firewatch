import { ChainType } from "@shared/modules/chain";
import { Chain } from "@firewatch/core/chain";
import { Env } from "../../../../env/src/types/env";
import { AssertionErrors } from "./errors";

/**
 * Validates the chain types of the source and destination chains.
 * @param allowedChainTypes The allowed chain types.
 * @param chain The chain to validate.
 * @returns True if the chain types are valid, false otherwise.
 */
export function assertChainTypes<C extends Chain>(allowedChainTypes: ChainType[], chain: C): boolean {
    if (!allowedChainTypes.includes(chain.type)) {
        throw new Error(AssertionErrors.CHAIN_TYPE_MISMATCH);
    }

    return true;
}

/**
 * Validates the environments of the chain.
 * @param allowedEnvironments The allowed environments.
 * @param chain The chain to validate.
 * @returns True if the environments are valid, false otherwise.
 */
export function assertChainEnvironments<C extends Chain>(allowedEnvironments: Env[], chain: C): boolean {
    if (!allowedEnvironments.includes(chain.env)) {
        throw new Error(AssertionErrors.CHAIN_ENVIRONMENT_MISMATCH);
    }

    return true;
}
