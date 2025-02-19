import { SignerError } from "./signer.error";

/**
 * Checks if an error is a signer error.
 * @param error The error to check.
 * @returns True if the error is a signer error, false otherwise.
 */
export function isSignerError(error: any): error is SignerError {
    return error instanceof Error && error.name === "SignerError";
}
