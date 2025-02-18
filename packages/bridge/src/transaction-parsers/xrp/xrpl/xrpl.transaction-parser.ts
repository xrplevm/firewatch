import { SubmittableTransaction, SubmitTransactionResponse, TxResponseResult } from "@shared/xrpl/transaction";
import { IXrplTransactionParserProvider } from "./interfaces/i-xrpl-transaction-parser.provider";
import { MAX_VALIDATION_TRIES, VALIDATION_POLLING_INTERVAL } from "./xrpl.transaction-parser.constants";
import { XrplTransactionParserOptions } from "./xrpl.transaction-parser.types";
import { Confirmed, Unconfirmed } from "@shared/modules/blockchain";
import { TransactionParserError } from "../../core/error/transaction-parser.error";
import { XrplTransactionParserErrors } from "./xrpl.transaction-parser.errors";
import { XrplTransaction } from "../../../signers/xrp/xrpl/xrpl.types";

export class XrplTransactionParser {
    private readonly options: XrplTransactionParserOptions;

    constructor(
        private readonly provider: IXrplTransactionParserProvider,
        {
            validationPollingInterval = VALIDATION_POLLING_INTERVAL,
            maxValidationTries = MAX_VALIDATION_TRIES,
        }: XrplTransactionParserOptions = {},
    ) {
        this.options = {
            validationPollingInterval,
            maxValidationTries,
        };
    }

    /**
     * Parses an XRPL submit transaction response into a transaction object.
     * @param submitTxResponse The XRPL submit transaction response.
     * @param extraValidatedData Extra data to add to the transaction object when it is confirmed.
     * @returns The transaction object.
     */
    parseSubmitTransactionResponse<T extends SubmittableTransaction, TData = {}>(
        submitTxResponse: SubmitTransactionResponse<T>,
        extraValidatedData?: (txResponse: TxResponseResult<T>) => TData,
    ): Unconfirmed<XrplTransaction> {
        const hash = submitTxResponse.result.tx_json.hash;

        if (!hash) throw new TransactionParserError(XrplTransactionParserErrors.SUBMITTED_TRANSACTION_CONTAINS_NO_HASH);

        return {
            confirmed: false,
            hash: hash,
            wait: async () => {
                const txResponse = await this.provider.awaitTransaction<T>(hash, {
                    validationPollingInterval: this.options.validationPollingInterval,
                    maxValidationTries: this.options.maxValidationTries,
                });
                const fee = txResponse.Fee;

                return {
                    hash: txResponse.hash,
                    confirmed: true,
                    fee: fee,
                    ...extraValidatedData?.(txResponse),
                } as Confirmed<XrplTransaction>;
            },
        };
    }
}
