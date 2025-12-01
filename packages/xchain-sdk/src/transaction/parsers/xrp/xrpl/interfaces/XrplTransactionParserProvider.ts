import { SubmittableTransaction } from "xrpl";
import { XrplTxResponseResult } from "../XrplTransaction.types";

export type AwaitTransactionOptions = {
    validationPollingInterval?: number;
    maxValidationTries?: number;
};

export interface XrplTransactionParserProvider {
    /**
     * Awaits a transaction to be validated.
     * @param hash The hash of the transaction.
     * @param options The options for the validation polling.
     * @returns A promise that resolves to the validated transaction.
     */
    awaitTransaction<T extends SubmittableTransaction = SubmittableTransaction>(
        hash: string,
        options?: AwaitTransactionOptions,
    ): Promise<XrplTxResponseResult<T>>;
}
