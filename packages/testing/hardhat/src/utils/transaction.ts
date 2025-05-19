import { TransactionReceipt, TransactionResponse, ContractTransactionResponse } from "ethers";
import { Unconfirmed, Transaction } from "@shared/modules/blockchain";
import { HardhatErrors } from "../constants";

type TxPromise = Promise<Unconfirmed<Transaction>> | Promise<ContractTransactionResponse>;

/**
 * Asserts a transaction reverts with the expected error message.
 * @param tx The transaction promise expected to revert.
 * @param expectedError The expected error message in the revert reason.
 * @throws An error if the transaction does not revert or the message does not match.
 */
export async function expectRevert(tx: TxPromise, expectedError: string): Promise<void> {
    try {
        const txResponse = await tx;
        await txResponse.wait();

        throw new Error(`Expected transaction to revert with '${expectedError}', but it did not.`);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);

        if (msg.startsWith("Expected transaction to revert")) {
            throw error;
        }

        if (!msg.includes(expectedError)) {
            throw new Error(`Expected revert with '${expectedError}', but got: '${msg}'`);
        }
    }
}

/**
 * Executes a transaction, waits for its confirmation, and calculates the gas cost.
 * @param txPromise A promise that resolves to a transaction response.
 * @returns An object containing the receipt and the gas cost (as a bigint).
 */
export async function executeTx(txPromise: Promise<TransactionResponse>): Promise<{ receipt: TransactionReceipt; gasCost: bigint }> {
    const tx = await txPromise;
    const receipt = await tx.wait();

    if (!receipt) {
        throw new Error(HardhatErrors.TRANSACTION_NOT_MINED);
    }

    const gasCost = receipt.gasUsed * receipt.gasPrice;
    return { receipt, gasCost };
}
