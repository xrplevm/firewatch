import { Confirmed, Unconfirmed, Transaction } from "@shared/modules/blockchain";
import { ethers } from "ethers";

export class EthersTransactionParser {
    /**
     * Parses an ethers transaction response into a transaction object, extending it with gasUsed and gasPrice.
     * @param txResponse The ethers transaction response.
     * @returns The transaction object with additional gasUsed and gasPrice properties.
     * @param extraConfirmedData Additional data to be added to the transaction object when it is confirmed.
     */
    parseTransactionResponse<TxRes extends ethers.TransactionResponse, TData = {}>(
        txResponse: TxRes,
        extraConfirmedData?: (txReceipt: Awaited<ReturnType<TxRes["wait"]>>) => TData,
    ): Unconfirmed<Transaction & TData> {
        return {
            confirmed: false,
            hash: txResponse.hash,
            wait: async () => {
                const txReceipt = await txResponse.wait();

                return {
                    hash: txReceipt!.hash,
                    confirmed: true,
                    receipt: txReceipt,
                    ...extraConfirmedData?.(txReceipt as Awaited<ReturnType<TxRes["wait"]>>),
                } as Confirmed<Transaction & TData>;
            },
        };
    }
}
