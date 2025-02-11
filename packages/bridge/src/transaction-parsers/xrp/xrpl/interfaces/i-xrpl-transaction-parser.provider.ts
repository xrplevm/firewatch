import { TxResponseResult } from "@shared/xrpl/transaction";
import { SubmittableTransaction } from "xrpl";

export type AwaitTransactionOptions = {
    validationPollingInterval?: number;
    maxValidationTries?: number;
};

export interface IXrplTransactionParserProvider {
    /**
     * Awaits a transaction to be validated.
     * @param hash The hash of the transaction.
     * @param options The options for the validation polling.
     * @returns A promise that resolves to the validated transaction.
     */
    awaitTransaction<T extends SubmittableTransaction = SubmittableTransaction>(
        hash: string,
        options?: AwaitTransactionOptions,
    ): Promise<TxResponseResult<T>>;
}
