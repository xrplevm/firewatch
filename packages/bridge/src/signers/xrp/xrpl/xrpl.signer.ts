import { IXrplSigner } from "./interfaces/i-xrpl.signer";
import { XrplSignerErrors } from "./xrpl.signer.errors";
import { SignerError } from "../../core/error";
import { XrplTransactionParser } from "../../../transaction-parsers/xrp/xrpl/xrpl.transaction-parser";
import { convertStringToHex, Payment, SubmittableTransaction, TrustSet, Wallet, xrpToDrops } from "xrpl";
import { IXrplSignerProvider } from "./interfaces/i-xrpl-signer.provider";
import { SubmitTransactionResponse } from "@shared/xrpl/transaction";
import { convertCurrencyCode } from "@shared/xrpl/currency-code";
import { MAX_SAFE_IOU_AMOUNT } from "@shared/xrpl";
import { Unconfirmed, Transaction } from "@shared/modules/blockchain";
import { Token } from "@firewatch/core/token";
import { XrplTransaction, ExtendedXrplTxResponse } from "./xrpl.types";

export class XrplSigner<Provider extends IXrplSignerProvider = IXrplSignerProvider> implements IXrplSigner {
    protected readonly transactionParser: XrplTransactionParser;

    constructor(
        protected readonly wallet: Wallet,
        readonly provider: Provider,
    ) {
        this.transactionParser = new XrplTransactionParser(provider);
    }

    /**
     * Handles service errors.
     * @param e Error.
     */
    private handleError(e: any): any {
        if (e instanceof Error) {
            const transactionSubmissionFiledMatches = /Transaction submission failed with code: (\b.+$)/.exec(e.message);
            if (transactionSubmissionFiledMatches) {
                const code = transactionSubmissionFiledMatches[1];
                throw new SignerError(XrplSignerErrors.TRANSACTION_SUBMISSION_FAILED, { code });
            } else {
                throw e;
            }
        } else {
            throw e;
        }
    }

    /**
     * @inheritdoc
     */
    getAddress(): Promise<string> {
        return Promise.resolve(this.wallet.address);
    }

    /**
     * Signs and submits a transaction.
     * @param tx The transaction to sign and submit.
     * @returns The transaction response.
     */
    private async signAndSubmitTransaction<T extends SubmittableTransaction>(tx: T): Promise<SubmitTransactionResponse<T>> {
        const completeTx = await this.provider.autofill(tx);

        const signedTx = this.wallet.sign(completeTx).tx_blob;

        const res = await this.provider.submit(signedTx);

        if (res.result.engine_result !== "tesSUCCESS") {
            throw new SignerError(XrplSignerErrors.TRANSACTION_SUBMISSION_FAILED, { code: res.result.engine_result });
        }

        return res as SubmitTransactionResponse<T>;
    }

    /**
     * @inheritdoc
     */
    async setTrustLine(issuer: string, currency: string, limitAmount = MAX_SAFE_IOU_AMOUNT): Promise<Unconfirmed<Transaction>> {
        try {
            const submitTxResponse = await this.signAndSubmitTransaction<TrustSet>({
                TransactionType: "TrustSet",
                Account: this.wallet.address,
                LimitAmount: {
                    currency: convertCurrencyCode(currency),
                    issuer: issuer,
                    value: limitAmount,
                },
            });
            return this.transactionParser.parseSubmitTransactionResponse(submitTxResponse);
        } catch (e) {
            return this.handleError(e);
        }
    }

    /**
     * @inheritdoc
     */
    async transfer(
        amount: string,
        token: Token,
        doorAddress: string,
        destinationChainId: string,
        destinationAddress: string,
    ): Promise<Unconfirmed<XrplTransaction>> {
        try {
            const submitTxResponse = await this.signAndSubmitTransaction<Payment>({
                TransactionType: "Payment",
                Account: this.wallet.address,
                // TODO: Handle IOU decimal values
                Amount: token.isNative()
                    ? xrpToDrops(amount)
                    : {
                          currency: convertCurrencyCode(token.symbol),
                          value: amount,
                          issuer: token.address!,
                      },
                Destination: doorAddress,
                Memos: [
                    {
                        Memo: {
                            //
                            MemoType: "64657374696E6174696F6E5F61646472657373", // hex(destination_address)
                            MemoData: destinationAddress,
                        },
                    },
                    {
                        Memo: {
                            MemoType: "64657374696E6174696F6E5F636861696E", // hex(destination_chain)
                            MemoData: convertStringToHex(destinationChainId),
                        },
                    },
                    // {
                    //     Memo: {
                    //         MemoType: "7061796C6F61645F68617368", // hex(payload_hash)
                    //         MemoData: "0000000000000000000000000000000000000000000000000000000000000000",
                    //     },
                    // },
                ],
            });

            return this.transactionParser.parseSubmitTransactionResponse(submitTxResponse, (txResponse) => ({
                fee: (txResponse as ExtendedXrplTxResponse).Fee,
            }));
        } catch (e) {
            return this.handleError(e);
        }
    }

    /**
     * @inheritdoc
     */
    async callContract(
        _sourceGatewayAddress: string,
        _destinationChainId: string,
        _destinationContractAddress: string,
        _payload: string,
    ): Promise<Unconfirmed<Transaction>> {
        return {} as Unconfirmed<Transaction>;
    }
}
