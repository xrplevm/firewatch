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
        options: { payload?: string; gasFeeAmount?: string } = {},
    ): Promise<Unconfirmed<XrplTransaction>> {
        try {
            const memos = [
                {
                    Memo: {
                        MemoType: convertStringToHex("type"),
                        MemoData: convertStringToHex("interchain_transfer"),
                    },
                },
                {
                    Memo: {
                        MemoType: convertStringToHex("destination_address"),
                        MemoData: destinationAddress,
                    },
                },
                {
                    Memo: {
                        MemoType: convertStringToHex("destination_chain"),
                        MemoData: convertStringToHex(destinationChainId),
                    },
                },
                {
                    Memo: {
                        MemoType: convertStringToHex("gas_fee_amount"),
                        MemoData: convertStringToHex(token.isNative() ? "0" : (options.gasFeeAmount ?? "0")),
                    },
                },
            ];

            let issuedCurrencyAmount;
            if (!token.isNative()) {
                issuedCurrencyAmount = {
                    currency: convertCurrencyCode(token.symbol),
                    issuer: token.address!,
                    value: amount,
                };

                console.log("issuedCurrencyAmount", issuedCurrencyAmount);
            }

            if (options.payload) {
                memos.push({
                    Memo: {
                        MemoType: convertStringToHex("payload"),
                        MemoData: options.payload,
                    },
                });
            }
            console.log("memos", memos);

            const payment: Payment = {
                TransactionType: "Payment",
                Account: this.wallet.address,
                Amount: token.isNative() ? xrpToDrops(amount) : issuedCurrencyAmount!,
                Destination: doorAddress,
                Memos: memos,
            };
            console.log("amount drops: ", payment.Amount);

            const submitTxResponse = await this.signAndSubmitTransaction<Payment>(payment);

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
        sourceGatewayAddress: string,
        destinationChainId: string,
        destinationContractAddress: string,
        payload: string,
        amount: string,
        token: Token,
    ): Promise<Unconfirmed<Transaction>> {
        try {
            const memos = [
                {
                    Memo: {
                        MemoType: convertStringToHex("type"),
                        MemoData: convertStringToHex("call_contract"),
                    },
                },
                {
                    Memo: {
                        MemoType: convertStringToHex("destination_address"),
                        MemoData: destinationContractAddress,
                    },
                },
                {
                    Memo: {
                        MemoType: convertStringToHex("destination_chain"),
                        MemoData: convertStringToHex(destinationChainId),
                    },
                },
                {
                    Memo: {
                        MemoType: convertStringToHex("payload"),
                        MemoData: payload,
                    },
                },
            ];
            console.log("memos", memos);

            let issuedCurrencyAmount;
            if (!token.isNative()) {
                issuedCurrencyAmount = {
                    currency: convertCurrencyCode(token.symbol),
                    issuer: token.address!,
                    value: amount,
                };

                console.log("issuedCurrencyAmount", issuedCurrencyAmount);
            }

            const payment: Payment = {
                TransactionType: "Payment",
                Account: this.wallet.address,
                Amount: token.isNative() ? xrpToDrops(amount) : issuedCurrencyAmount!,
                Destination: sourceGatewayAddress,
                Memos: memos,
            };
            console.log("amount", payment.Amount);

            const submitTxResponse = await this.signAndSubmitTransaction<Payment>(payment);

            return this.transactionParser.parseSubmitTransactionResponse(submitTxResponse);
        } catch (e) {
            return this.handleError(e);
        }
    }

    /**
     * Sends an XRPL Payment transaction to add gas for a GMP message.
     * @param gasFee The gas fee amount to send (as a string, in XRP or issued currency units).
     * @param msgId The original GMP message ID to reference.
     * @param destination The address to send the payment to (e.g., gateway or contract address).
     * @param token The token to use for gas (optional).
     * @returns The unconfirmed transaction object.
     */
    async addGas(gasFee: string, msgId: string, destination: string, token?: Token): Promise<Unconfirmed<Transaction>> {
        try {
            const memos = [
                {
                    Memo: {
                        MemoType: convertStringToHex("type"),
                        MemoData: convertStringToHex("add_gas"),
                    },
                },
                {
                    Memo: {
                        MemoType: convertStringToHex("msg_id"),
                        MemoData: convertStringToHex(msgId),
                    },
                },
            ];

            let issuedCurrencyAmount;
            if (token) {
                issuedCurrencyAmount = {
                    currency: convertCurrencyCode(token.symbol),
                    issuer: token.address!,
                    value: gasFee,
                };
            }

            const payment: Payment = {
                TransactionType: "Payment",
                Account: this.wallet.address,
                Amount: token ? issuedCurrencyAmount! : gasFee,
                Destination: destination,
                Memos: memos,
            };
            console.log("payment", payment);

            const submitTxResponse = await this.signAndSubmitTransaction<Payment>(payment);

            return this.transactionParser.parseSubmitTransactionResponse(submitTxResponse);
        } catch (e) {
            return this.handleError(e);
        }
    }
}
