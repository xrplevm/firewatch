import { Unconfirmed, Transaction } from "@shared/modules/blockchain";

/**
 * Asserts a transaction reverts with the expected error message.
 * @param tx The transaction promise expected to revert.
 * @param expectedError The expected error message in the revert reason.
 * @throws An error if the transaction does not revert or the message does not match.
 */
export async function assertRevert(tx: Promise<Unconfirmed<Transaction>>, expectedError: string): Promise<void> {
    try {
        await tx;
        throw new Error(`Expected transaction to revert with '${expectedError}', but it did not.`);
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (!errMsg.includes(expectedError)) {
            throw new Error(`Expected error message to include '${expectedError}', but got: ${errMsg}`);
        }
    }
}
