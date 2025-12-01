import { ethers } from "ethers";
import { EthersTransactionParserError, EthersTransactionParserErrors } from "./EthersTransactionParser.errors";
import { Confirmed, CreateBridgeRequestTransaction, CreateClaimTransaction, Transaction, Unconfirmed } from "../../../types";
import { ClaimId } from "../../../../bridge/utils";
import { EthersTransactionParserProvider } from "./interfaces";
import { XChainTokenFormat } from "../../../../xchain";
import { ChainType } from "../../../../common";
import { polling } from "../../../../common/utils/promise";
import { BRIDGE_CREATION_POLLING_INTERVAL, MAX_BRIDGE_CREATION_TRIES } from "./EthersTransactionParser.constants";
import { EthersTransactionParserOptions } from "./EthersTransactionParser.types";

export class EthersTransactionParser {
    private readonly options: EthersTransactionParserOptions;

    constructor(
        private readonly provider: EthersTransactionParserProvider,
        {
            bridgeCreationPollingInterval = BRIDGE_CREATION_POLLING_INTERVAL,
            maxBridgeCreationTries = MAX_BRIDGE_CREATION_TRIES,
        }: EthersTransactionParserOptions = {},
    ) {
        this.options = {
            bridgeCreationPollingInterval,
            maxBridgeCreationTries,
        };
    }

    /**
     * Parses an ethers transaction response into a transaction object.
     * @param txResponse The ethers transaction response.
     * @param extraConfirmedData Extra data to add to the transaction object when it is confirmed.
     * @returns The transaction object.
     */
    parseTransactionResponse<TxRes extends ethers.providers.TransactionResponse, TData = {}>(
        txResponse: TxRes,
        extraConfirmedData?: (txReceipt: Awaited<ReturnType<TxRes["wait"]>>) => TData,
    ): Unconfirmed<Transaction & TData> {
        return {
            confirmed: false,
            hash: txResponse.hash,
            wait: async () => {
                const txReceipt = await txResponse.wait();

                return {
                    hash: txReceipt.transactionHash,
                    confirmed: true,
                    ...extraConfirmedData?.(txReceipt as Awaited<ReturnType<TxRes["wait"]>>),
                } as Confirmed<Transaction & TData>;
            },
        };
    }

    /**
     * Parses a create claim transaction into a transaction object.
     * @param contractTx The ethers contract transaction.
     * @returns The transaction object.
     */
    parseCreateClaimTransactionResponse(contractTx: ethers.ContractTransaction): Unconfirmed<CreateClaimTransaction> {
        return this.parseTransactionResponse(contractTx, (txReceipt) => {
            const claimId = txReceipt.events?.find((event) => event.event === "CreateClaim")?.args?.[1] as ethers.BigNumber | undefined;

            if (!claimId) throw new EthersTransactionParserError(EthersTransactionParserErrors.CONTRACT_TRANSACTION_IS_NOT_A_CLAIM_ID);

            return { claimId: ClaimId.fromHex(claimId.toHexString()) };
        });
    }

    /**
     * Parses a create bridge request transaction into a transaction object.
     * @param contractTx The ethers contract transaction.
     * @param doorAddress The (locking) door address.
     * @param token The token.
     * @param issuingDoorAddress The issuing door address.
     * @returns The transaction object.
     */
    parseCreateBridgeRequestTransactionResponse(
        contractTx: ethers.ContractTransaction,
        doorAddress: string,
        token: XChainTokenFormat<ChainType.EVM>,
        issuingDoorAddress: string,
    ): Unconfirmed<CreateBridgeRequestTransaction> {
        return this.parseTransactionResponse(contractTx, () => {
            return {
                waitCreation: () =>
                    polling(
                        () => this.provider.findTokenBridge(doorAddress, token, issuingDoorAddress),
                        (xChainBridge) => !xChainBridge,
                        {
                            delay: this.options.bridgeCreationPollingInterval,
                            maxIterations: this.options.maxBridgeCreationTries,
                        },
                    ),
            };
        });
    }
}
