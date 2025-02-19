import { TransactionReceipt, Log, Interface, LogDescription, TransactionResponse, EventLog, Contract, ContractTransaction } from "ethers";
import { expect } from "chai";
import { HardhatErrors } from "../constants";

/**
 * Asserts that a transaction reverts with a specific error message.
 * @param tx The transaction promise that should revert.
 * @param expectedError The expected revert error message.
 */
export async function expectRevert(tx: Promise<ContractTransaction>, expectedError: string): Promise<void> {
    try {
        await tx;
        expect.fail(HardhatErrors.TRANSACTION_REVERTED);
    } catch (error: unknown) {
        expect((error as Error).message).to.contain(expectedError);
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
