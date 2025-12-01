import { AccountObjectsResponse, Client, RippledError, SubmittableTransaction } from "xrpl";
import { Bridge, XChainOwnedClaimID } from "xrpl/dist/npm/models/ledger";
import { MAX_VALIDATION_TRIES, VALIDATION_POLLING_INTERVAL } from "./XrplXChainProvider.constants";
import { XrpXChainWalletProvider } from "../../../../wallet/wallets/xrp";
import { XrplXChainSignerProvider } from "../../../../signer/signers/xrp";
import { convertCurrencyCode, withAutoConnect } from "../../../../common/utils/xrpl";
import {
    AwaitTransactionOptions,
    XrplSubmitTransactionResponse,
    XrplTransactionParserProvider,
    XrplTxResponse,
    XrplTxResponseResult,
} from "../../../../transaction/parsers/xrp";
import { polling } from "../../../../common/utils/promise";
import { ClaimId } from "../../../../bridge/utils";
import { FormattedBridge } from "../../../../bridge/Bridge";
import { ChainType } from "../../../../common/types";
import { BridgeDoorProvider } from "../../../../bridge/BridgeDoor/interfaces";
import { PartialXChainBridge } from "../../../../xchain";

export class XrplXChainProvider
    implements XrpXChainWalletProvider, XrplXChainSignerProvider, BridgeDoorProvider, XrplTransactionParserProvider
{
    readonly xrplClient: Client;

    constructor(client: Client) {
        this.xrplClient = withAutoConnect(client);
    }

    autofill<T extends SubmittableTransaction>(transaction: T, signersCount?: number): Promise<T> {
        return this.xrplClient.autofill(transaction, signersCount);
    }

    submit<T extends SubmittableTransaction>(transaction: string): Promise<XrplSubmitTransactionResponse<T>> {
        return this.xrplClient.submit(transaction) as Promise<XrplSubmitTransactionResponse<T>>;
    }

    /**
     * Gets a transaction response from its hash.
     * @param hash The hash of the transaction.
     */
    async getTransaction<T extends SubmittableTransaction>(hash: string): Promise<XrplTxResponseResult<T>> {
        const txResult = (await this.xrplClient.request({ command: "tx", transaction: hash })) as XrplTxResponse<T>;
        return txResult.result;
    }

    /**
     * Checks if a transaction is validated.
     * @param hash The hash of the transaction.
     */
    async isTransactionValidated(hash: string): Promise<boolean> {
        const tx = await this.getTransaction(hash);
        return !!tx.validated;
    }

    /**
     * Gets the claims of an account.
     * TODO: Paginate?
     * @param address The address of the account.
     */
    async getAccountClaims(address: string): Promise<XChainOwnedClaimID[]> {
        const res = await this.xrplClient.request({ command: "account_objects", type: "xchain_owned_claim_id", account: address });
        if (!res.result || !res.result.account_objects) return [];
        // XChainClaim type is guaranteed by the type field in the request
        else return res.result.account_objects as unknown as XChainOwnedClaimID[];
    }

    async isAccountActive(address: string): Promise<boolean> {
        try {
            await this.xrplClient.request({ command: "account_info", account: address });
            return true;
        } catch (e) {
            if (e instanceof RippledError && e.message === "Account not found.") return false;
            else throw e;
        }
    }

    async getNativeBalance(address: string): Promise<string> {
        const response = await this.xrplClient.request({ command: "account_info", account: address });
        return response.result.account_data.Balance;
    }

    async awaitTransaction<T extends SubmittableTransaction = SubmittableTransaction>(
        hash: string,
        {
            validationPollingInterval = VALIDATION_POLLING_INTERVAL,
            maxValidationTries = MAX_VALIDATION_TRIES,
        }: AwaitTransactionOptions = {},
    ): Promise<XrplTxResponseResult<T>> {
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

    async accountHasTrustLine(address: string, issuer: string, currency: string): Promise<boolean> {
        const convertedCurrency = convertCurrencyCode(currency);
        const accountLinesRes = await this.xrplClient.request({ command: "account_lines", account: address });
        return !!accountLinesRes.result.lines.find((line) => line.currency === convertedCurrency && line.account === issuer);
    }

    async isClaimAttested(address: string, claimId: ClaimId, bridgeConfig: FormattedBridge<ChainType.XRP>): Promise<boolean> {
        const claims = await this.getAccountClaims(address);
        return !claims.some((claim) => {
            const potentialClaimId =
                typeof claim.XChainClaimID === "string" ? ClaimId.fromHex(claim.XChainClaimID) : ClaimId.fromInt(claim.XChainClaimID);
            return potentialClaimId.hex === claimId.hex && JSON.stringify(claim.XChainBridge) === JSON.stringify(bridgeConfig.xChainBridge);
        });
    }

    async isCreateAccountCommitAttested(address: string): Promise<boolean> {
        return this.isAccountActive(address);
    }

    async getXChainBridges(doorAddress: string, id?: string): Promise<PartialXChainBridge<ChainType, ChainType>[]> {
        const xChainBridges: PartialXChainBridge[] = [];
        let marker;

        do {
            const res: AccountObjectsResponse = await this.xrplClient.request({
                command: "account_objects",
                account: doorAddress,
                type: "bridge",
                limit: 100,
                marker,
            });

            // Set the marker for the next request
            marker = res.result.marker;

            const bridges = res.result.account_objects as Bridge[]; // Filtered by type: "bridge"

            for (const bridge of bridges) {
                xChainBridges.push(
                    PartialXChainBridge.fromXrp(
                        doorAddress,
                        bridge.XChainBridge,
                        bridge.SignatureReward as string, // XRP (drops)
                        bridge.MinAccountCreateAmount,
                        id,
                    ),
                );
            }
        } while (marker);

        return xChainBridges;
    }
}
