import { SubmittableTransaction } from "xrpl";
import { IXrplTransactionParserProvider } from "../../../../transaction-parsers/xrp/xrpl/interfaces";
import { SubmitTransactionResponse } from "@shared/xrpl/transaction";

export interface IXrplSignerProvider extends IXrplTransactionParserProvider {
    /**
     * Autofill helps fill in fields which should be included in a transaction, but can be determined automatically
     * such as `LastLedgerSequence` and `Fee`. If you override one of the fields `autofill` changes, your explicit
     * values will be used instead. By default, this is done as part of `submit` and `submitAndWait` when you pass
     * in an unsigned transaction along with your wallet to be submitted.
     * @param transaction A {@link Transaction} in JSON format.
     * @param signersCount The expected number of signers for this transaction.
     * Only used for multisigned transactions.
     * @returns The autofilled transaction.
     */
    autofill<T extends SubmittableTransaction>(transaction: T, signersCount?: number): Promise<T>;

    /**
     * Submits a signed transaction.
     * @param transaction A signed transaction to submit.
     * @returns A promise that contains SubmitResponse.
     */
    submit<T extends SubmittableTransaction>(transaction: string): Promise<SubmitTransactionResponse<T>>;
}
