import { CreatedNode, XChainCreateClaimID, SubmittableTransaction } from "xrpl";
import { XrplSubmitTransactionResponse, XrplTxResponseResult } from "./XrplTransaction.types";
import { XrplTransactionParserError, XrplTransactionParserErrors } from "./errors/XrplTransactionParser.errors";
import { XrplTransactionParserProvider } from "./interfaces";
import { XrplTransactionParserOptions } from "./XrplTransactionParser.types";
import { MAX_VALIDATION_TRIES, VALIDATION_POLLING_INTERVAL } from "./XrplTransactionParser.constants";
import { Confirmed, CreateClaimTransaction, Transaction, Unconfirmed } from "../../../types";
import { ClaimId } from "../../../../bridge/utils";

export class XrplTransactionParser {
    private readonly options: XrplTransactionParserOptions;

    constructor(
        private readonly provider: XrplTransactionParserProvider,
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
        submitTxResponse: XrplSubmitTransactionResponse<T>,
        extraValidatedData?: (txResponse: XrplTxResponseResult<T>) => TData,
    ): Unconfirmed<Transaction & TData> {
        const hash = submitTxResponse.result.tx_json.hash;

        if (!hash) throw new XrplTransactionParserError(XrplTransactionParserErrors.SUBMITTED_TRANSACTION_CONTAINS_NO_HASH);

        return {
            confirmed: false,
            hash: hash,
            wait: async () => {
                const txResponse = await this.provider.awaitTransaction<T>(hash, {
                    validationPollingInterval: this.options.validationPollingInterval,
                    maxValidationTries: this.options.maxValidationTries,
                });

                return {
                    hash: txResponse.hash,
                    confirmed: true,
                    ...extraValidatedData?.(txResponse),
                } as Confirmed<Transaction & TData>;
            },
        };
    }

    parseSubmitCreateClaimTransactionResponse(
        submitTxResponse: XrplSubmitTransactionResponse<XChainCreateClaimID>,
    ): Unconfirmed<CreateClaimTransaction> {
        return this.parseSubmitTransactionResponse(submitTxResponse, (txResponse) => {
            if (txResponse.meta && typeof txResponse.meta === "object") {
                const createdClaimIdNode = txResponse.meta?.AffectedNodes.find(
                    (n) => "CreatedNode" in n && n.CreatedNode.LedgerEntryType === "XChainOwnedClaimID",
                ) as CreatedNode | undefined;

                if (!createdClaimIdNode)
                    throw new XrplTransactionParserError(XrplTransactionParserErrors.CLAIM_ID_NOT_FOUND_IN_TRANSACTION);

                const claimId = ClaimId.fromHex(createdClaimIdNode.CreatedNode.NewFields.XChainClaimID as string);

                return { claimId };
            } else {
                throw new XrplTransactionParserError(XrplTransactionParserErrors.CLAIM_ID_NOT_FOUND_IN_TRANSACTION);
            }
        });
    }
}
