import { ProviderError } from "./provider.error";

/**
 * Checks if an error is a provider error.
 * @param error The error to check.
 * @returns True if the error is a provider error, false otherwise.
 */
export function isProviderError(error: any): error is ProviderError {
    return error instanceof Error && error.name === "ProviderError";
}
