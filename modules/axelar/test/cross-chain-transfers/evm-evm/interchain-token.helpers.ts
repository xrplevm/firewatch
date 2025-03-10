import { InterchainToken } from "@shared/evm/contracts";
import { polling, PollingOptions } from "@shared/utils";
import BigNumber from "bignumber.js";

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
