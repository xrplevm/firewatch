import { TranslatorError } from "./translator.error";

/**
 * Checks if an error is a signer error.
 * @param error The error to check.
 * @returns True if the error is a signer error, false otherwise.
 */
export function isTranslatorError(error: any): error is TranslatorError {
    return error instanceof Error && error.name === "TranslatorError";
}
