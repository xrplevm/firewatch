import { InterchainToken } from "@shared/evm/contracts";
import { polling, PollingOptions } from "@shared/utils";
import BigNumber from "bignumber.js";

/**
 * Polls the token contract’s balance for a given address until the balance increases by the expected delta.
 * Throws an error if the final balance does not match the expected value.
 * @param token The InterchainToken instance.
 * @param address The address whose balance is to be checked.
 * @param initialBalance The starting balance as a BigNumber.
 * @param delta The expected balance increase as a BigNumber.
 * @param pollingOpts Polling options.
 */
export async function assertInterchainBalanceUpdate(
    token: InterchainToken,
    address: string,
    initialBalance: BigNumber,
    delta: BigNumber,
    pollingOpts: PollingOptions,
): Promise<void> {
    await polling(
        async () => {
            const currentBalanceRaw = await token.balanceOf(address);
            const currentBalance = new BigNumber(currentBalanceRaw.toString());
            return currentBalance.eq(initialBalance.plus(delta));
        },
        (result) => !result,
        pollingOpts,
    );

    const finalBalanceRaw = await token.balanceOf(address);
    const finalBalance = new BigNumber(finalBalanceRaw.toString());
    const expectedBalance = initialBalance.plus(delta);
    if (!finalBalance.eq(expectedBalance)) {
        throw new Error(`Balance mismatch! Expected: ${expectedBalance.toString()}, Actual: ${finalBalance.toString()}`);
    }
}
