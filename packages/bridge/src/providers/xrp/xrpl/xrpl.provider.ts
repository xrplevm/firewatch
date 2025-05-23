import { AccountTxResponse, AccountTxTransaction, Client, RippledError, SubmittableTransaction, xrpToDrops } from "xrpl";
import { IXrplProvider } from "./interfaces/i-xrpl.provider";
import BigNumber from "bignumber.js";
import { convertCurrencyCode } from "@shared/xrpl/currency-code";
import { XRPL_TOKEN_DECIMALS } from "@shared/xrpl";
import { decimalToInt } from "@shared/number";
import { withAutoConnect } from "@shared/xrpl/client";
import { ProviderError } from "../../core/error";
import { XrplProviderErrors } from "./xrpl.provider.errors";
import { SubmitTransactionResponse, TxResponse, TxResponseResult } from "@shared/xrpl/transaction";
import { MAX_VALIDATION_TRIES, VALIDATION_POLLING_INTERVAL } from "../../../transaction-parsers/xrp/xrpl/xrpl.transaction-parser.constants";
import { AwaitTransactionOptions } from "../../../transaction-parsers/xrp/xrpl/interfaces/i-xrpl-transaction-parser.provider";
import { polling } from "@shared/utils";
import { Token } from "@firewatch/core/token";

export class XrplProvider implements IXrplProvider {
    readonly xrplClient: Client;

    constructor(client: Client) {
        this.xrplClient = withAutoConnect(client);
    }

    /**
     * @inheritdoc
     */
    autofill<T extends SubmittableTransaction>(transaction: T, signersCount?: number): Promise<T> {
        return this.xrplClient.autofill(transaction, signersCount);
    }

    /**
     * @inheritdoc
     */
    submit<T extends SubmittableTransaction>(transaction: string): Promise<SubmitTransactionResponse<T>> {
        return this.xrplClient.submit(transaction) as Promise<SubmitTransactionResponse<T>>;
    }

    /**
     * Gets a transaction response from its hash.
     * @param hash The hash of the transaction.
     * @returns The transaction response.
     */
    async getTransaction<T extends SubmittableTransaction>(hash: string): Promise<TxResponseResult<T>> {
        const txResult = (await this.xrplClient.request({ command: "tx", transaction: hash })) as TxResponse<T>;
        return txResult.result;
    }

    /**
     * Gets the list of transactions for an account.
     * @param address The address of the account.
     * @param limit The maximum number of transactions to retrieve. Defaults to 10.
     * @returns An array of account transactions.
     */
    async getAccountTransactions(address: string, limit = 10): Promise<AccountTxTransaction[]> {
        const resp = (await this.xrplClient.request({
            command: "account_tx",
            account: address,
            ledger_index_min: -1,
            ledger_index_max: -1,
            binary: false,
            limit,
        })) as AccountTxResponse;

        return resp.result.transactions;
    }

    /**
     * Checks if a transaction is validated.
     * @param hash The hash of the transaction.
     * @returns True if the transaction is validated, false otherwise.
     */
    async isTransactionValidated(hash: string): Promise<boolean> {
        const tx = await this.getTransaction(hash);
        return !!tx.validated;
    }

    /**
     * @inheritdoc
     */
    async awaitTransaction<T extends SubmittableTransaction = SubmittableTransaction>(
        hash: string,
        {
            validationPollingInterval = VALIDATION_POLLING_INTERVAL,
            maxValidationTries = MAX_VALIDATION_TRIES,
        }: AwaitTransactionOptions = {},
    ): Promise<TxResponseResult<T>> {
        await polling(
            () => this.isTransactionValidated(hash),
            (res) => !res,
            {
                delay: validationPollingInterval,
                maxIterations: maxValidationTries,
            },
        );
        const txResult = await this.getTransaction<T>(hash);
        return txResult;
    }

    /**
     * Checks if an account is active.
     * @param address The address of the account.
     * @returns True if the account is active, false otherwise.
     */
    async isAccountActive(address: string): Promise<boolean> {
        try {
            await this.xrplClient.request({ command: "account_info", account: address });
            return true;
        } catch (e) {
            if (e instanceof RippledError && e.message === "Account not found.") return false;
            else throw e;
        }
    }

    /**
     * Gets the xrp reserve of an account in drops.
     * @param address The address of the account.
     * @returns The reserve in drops.
     */
    async getReserve(address: string): Promise<string> {
        const serverInfo = await this.xrplClient.request({
            command: "server_info",
        });

        const accountInfo = await this.xrplClient.request({
            command: "account_info",
            account: address,
            ledger_index: "validated",
        });

        if (serverInfo.result && serverInfo.result.info.validated_ledger && accountInfo.result) {
            const reserveBase = serverInfo.result.info.validated_ledger.reserve_base_xrp;
            const reserveInc = serverInfo.result.info.validated_ledger.reserve_inc_xrp;
            const ownerCount = accountInfo.result.account_data.OwnerCount;
            return xrpToDrops(
                BigNumber(reserveBase)
                    .plus(BigNumber(reserveInc).multipliedBy(BigNumber(ownerCount)))
                    .toString(),
            );
        } else {
            throw new ProviderError(XrplProviderErrors.COULD_NOT_GET_XRP_RESERVE_OF_ADDRESS, { address });
        }
    }

    /**
     * @inheritdoc
     */
    async getNativeBalance(address: string): Promise<string> {
        let balance: string;

        try {
            balance = xrpToDrops(await this.xrplClient.getXrpBalance(address));
        } catch (_e) {
            return "0";
        }

        const reserve = await this.getReserve(address);

        return BigNumber.max(BigNumber(balance).minus(BigNumber(reserve)), BigNumber(0)).toString();
    }

    /**
     * Gets the IOU balance of an account as an integer.
     * @param address Address of the account.
     * @param issuer The issuer of the IOU.
     * @param currencyCode The IOU currency.
     * @returns The balance in drops.
     */
    async getIOUBalance(address: string, issuer: string, currencyCode: string): Promise<string> {
        const balances = await this.xrplClient.getBalances(address);

        return decimalToInt(
            balances.find((balance) => balance.currency === convertCurrencyCode(currencyCode) && balance.issuer === issuer)?.value || "0",
            XRPL_TOKEN_DECIMALS,
        );
    }

    /**
     * @inheritdoc
     */
    async getTokenBalance(address: string, token: Token): Promise<string> {
        if (token.isNative()) return this.getNativeBalance(address);
        else return this.getIOUBalance(address, token.address!, token.symbol);
    }

    /**
     * @inheritdoc
     */
    async accountHasTrustLine(address: string, issuer: string, currency: string): Promise<boolean> {
        const convertedCurrency = convertCurrencyCode(currency);
        const accountLinesRes = await this.xrplClient.request({ command: "account_lines", account: address });
        return !!accountLinesRes.result.lines.find((line) => line.currency === convertedCurrency && line.account === issuer);
    }
}
