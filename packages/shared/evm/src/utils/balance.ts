import { polling, PollingOptions } from "@shared/utils";
import BigNumber from "bignumber.js";

/**
 * Polls until a balance function returns the expected value.
 * @param getBalanceFn An async function that returns the current balance (as string, number, or BigNumber).
 * @param expectedBalance The expected balance (as string, number, or BigNumber).
 * @param pollingOptions Options for polling.
 * @throws An error if the balance does not match the expected value within the polling period.
 */
export async function expectBalanceUpdate(
    getBalanceFn: () => Promise<string | number>,
    expectedBalance: string | number | BigNumber,
    pollingOptions: PollingOptions,
): Promise<void> {
    await polling(
        async () => {
            const current = await getBalanceFn();
            const currentBN = BigNumber(current.toString());
            const expectedBN = BigNumber(expectedBalance.toString());
            return currentBN.eq(expectedBN);
        },
        (matched: boolean) => !matched,
        pollingOptions,
    );

    // Final check after polling
    const final = await getBalanceFn();
    const finalBN = BigNumber(final.toString());
    const expectedBN = BigNumber(expectedBalance.toString());
    if (!finalBN.eq(expectedBN)) {
        throw new Error(`Balance mismatch! Expected: ${expectedBN}, Actual: ${finalBN}`);
    }
}
