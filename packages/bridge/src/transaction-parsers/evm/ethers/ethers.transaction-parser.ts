import { Confirmed, Transaction, Unconfirmed } from "@shared/modules/blockchain";
import { ethers } from "ethers";

export class EthersTransactionParser {
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
}
