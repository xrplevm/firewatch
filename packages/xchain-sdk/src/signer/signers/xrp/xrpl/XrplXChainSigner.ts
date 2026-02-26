import { TrustSet, Wallet, XChainAccountCreateCommit, XChainCommit, XChainCreateClaimID } from "xrpl";
import { XrplXChainSignerProvider } from "./interfaces";
import { SubmittableTransaction } from "xrpl";
import { XrpXChainWalletSigner } from "../../../../wallet/wallets/xrp";
import { XrplSubmitTransactionResponse, XrplTransactionParser } from "../../../../transaction/parsers/xrp";
import { MAX_SAFE_IOU_AMOUNT } from "../../../../common/constants/xrp.constants";
import {
    CommitTransaction,
    CreateAccountCommitTransaction,
    CreateClaimTransaction,
    TrustClaimTransaction,
    Unconfirmed,
} from "../../../../transaction/types";
import { buildAmount, convertCurrencyCode } from "../../../../common/utils/xrpl";
import { FormattedBridge } from "../../../../bridge/Bridge";
import { ChainType } from "../../../../common/types";
import { ClaimId } from "../../../../bridge/utils";
import { XrplXChainSignerError, XrplXChainSignerErrors } from "./XrplXChainSigner.errors";

export class XrplXChainSigner<Provider extends XrplXChainSignerProvider = XrplXChainSignerProvider> implements XrpXChainWalletSigner {
    protected readonly transactionParser: XrplTransactionParser;

    constructor(
        protected readonly wallet: Wallet,
        readonly provider: Provider,
    ) {
        this.transactionParser = new XrplTransactionParser(provider);
    }

    /**
     * Signs and submits a transaction
     * @param tx The transaction to sign and submit
     */
    private async signAndSubmitTransaction<T extends SubmittableTransaction>(tx: T): Promise<XrplSubmitTransactionResponse<T>> {
        const completeTx = await this.provider.autofill(tx);
        const signedTx = this.wallet.sign(completeTx).tx_blob;
        const res = await this.provider.submit(signedTx);

        if (res.result.engine_result !== "tesSUCCESS") {
            throw new XrplXChainSignerError(XrplXChainSignerErrors.TRANSACTION_SUBMISSION_FAILED, { code: res.result.engine_result });
        }

        return res as XrplSubmitTransactionResponse<T>;
    }

    getAddress(): Promise<string> {
        return Promise.resolve(this.wallet.address);
    }

    async setTrustLine(issuer: string, currency: string, limitAmount = MAX_SAFE_IOU_AMOUNT): Promise<Unconfirmed<TrustClaimTransaction>> {
        const submitTxResponse = await this.signAndSubmitTransaction<TrustSet>({
            TransactionType: "TrustSet",
            Account: this.wallet.address,
            LimitAmount: {
                currency: convertCurrencyCode(currency),
                issuer: issuer,
                value: limitAmount,
            },
        });
        const unconfirmedTx = this.transactionParser.parseSubmitTransactionResponse(submitTxResponse);
        return unconfirmedTx;
    }

    async createClaim(originAddress: string, bridge: FormattedBridge<ChainType.XRP>): Promise<Unconfirmed<CreateClaimTransaction>> {
        const submitTxResponse = await this.signAndSubmitTransaction<XChainCreateClaimID>({
            TransactionType: "XChainCreateClaimID",
            XChainBridge: bridge.xChainBridge,
            OtherChainSource: originAddress,
            SignatureReward: bridge.destinationXChainBridgeChain.signatureReward,
            Account: this.wallet.address,
        });
        const unconfirmedTx = this.transactionParser.parseSubmitCreateClaimTransactionResponse(submitTxResponse);
        return unconfirmedTx;
    }

    async commit(
        claimId: ClaimId,
        destinationAddress: string,
        bridge: FormattedBridge<ChainType.XRP>,
        amount: string,
    ): Promise<Unconfirmed<CommitTransaction>> {
        const submitTxResponse = await this.signAndSubmitTransaction<XChainCommit>({
            TransactionType: "XChainCommit",
            XChainBridge: bridge.xChainBridge,
            XChainClaimID: claimId.hex,
            OtherChainDestination: destinationAddress,
            Amount: buildAmount(amount, bridge.originXChainBridgeChain.issue),
            Account: this.wallet.address,
        });
        const unconfirmedTx = this.transactionParser.parseSubmitTransactionResponse(submitTxResponse);
        return unconfirmedTx;
    }

    async createAccountCommit(
        destinationAddress: string,
        bridge: FormattedBridge<ChainType.XRP>,
        amount: string,
    ): Promise<Unconfirmed<CreateAccountCommitTransaction>> {
        const submitTxResponse = await this.signAndSubmitTransaction<XChainAccountCreateCommit>({
            TransactionType: "XChainAccountCreateCommit",
            XChainBridge: bridge.xChainBridge,
            Destination: destinationAddress,
            SignatureReward: bridge.originXChainBridgeChain.signatureReward,
            Amount: buildAmount(amount, bridge.originXChainBridgeChain.issue),
            Account: this.wallet.address,
        });
        const unconfirmedTx = this.transactionParser.parseSubmitTransactionResponse(submitTxResponse);
        return unconfirmedTx;
    }
}
