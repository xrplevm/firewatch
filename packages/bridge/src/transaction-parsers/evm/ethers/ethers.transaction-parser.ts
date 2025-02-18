import { Confirmed, Unconfirmed } from "@shared/modules/blockchain";
import { ethers } from "ethers";
import { EthersTransaction } from "../../../signers/evm/ethers";

export class EthersTransactionParser {
    /**
     * Parses an ethers transaction response into a transaction object, extending it with gasUsed and gasPrice.
     * @param txResponse The ethers transaction response.
     * @returns The transaction object with additional gasUsed and gasPrice properties.
     */
    parseTransactionResponse<TxRes extends ethers.TransactionResponse>(txResponse: TxRes): Unconfirmed<EthersTransaction> {
        return {
            confirmed: false,
            hash: txResponse.hash,
            wait: async () => {
                const txReceipt = await txResponse.wait();

                const gasPrice = txReceipt!.gasPrice;
                const gasUsed = txReceipt!.gasUsed;
                return {
                    ...txReceipt,
                    confirmed: true,
                    gasUsed,
                    gasPrice,
                } as Confirmed<EthersTransaction>;
            },
        };
    }
}
