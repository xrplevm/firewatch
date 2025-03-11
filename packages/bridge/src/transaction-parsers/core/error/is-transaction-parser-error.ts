import { TransactionParserError } from "./transaction-parser.error";

/**
 * Checks if an error is a signer error.
 * @param error The error to check.
 * @returns True if the error is a signer error, false otherwise.
 */
export function isTransactionParserError(error: any): error is TransactionParserError {
    return error instanceof Error && error.name === "TransactionParserError";
}
