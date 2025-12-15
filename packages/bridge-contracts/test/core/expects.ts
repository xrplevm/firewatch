import { ERC20, GnosisSafeL2Mock } from "../../typechain-types";
import { BigNumber } from "ethers";
import { expect } from "chai";

export async function expectSentWith(
    safe: GnosisSafeL2Mock,
    to?: string,
    value?: BigNumber,
    data?: string,
    operation?: number,
    fromBlock?: number,
) {
    const events = await safe.queryFilter(safe.filters.ExecTransactionFromModule(), fromBlock);
    const found = events.some((event) => {
        return (
            ((to !== undefined && event.args?.to === to) || to === undefined) &&
            ((value !== undefined && event.args?.value.eq(value)) || value === undefined) &&
            ((data !== undefined && event.args?.data === data) || data === undefined) &&
            ((operation !== undefined && event.args?.operation === operation) || operation === undefined)
        );
    });

    expect(found).to.be.true;
}

export async function expectSentTimes(safe: GnosisSafeL2Mock, times: number, fromBlock?: number) {
    const events = await safe.queryFilter(safe.filters.ExecTransactionFromModule(), fromBlock);
    expect(events.length).to.equal(times);
}

export async function expectReceivedWith(safe: GnosisSafeL2Mock, from?: string, value?: BigNumber, fromBlock?: number) {
    const events = await safe.queryFilter(safe.filters.Received(), fromBlock);
    const found = events.some((event) => {
        return (
            ((from !== undefined && event.args?.from === from) || from === undefined) &&
            ((value !== undefined && event.args?.value.eq(value)) || value === undefined)
        );
    });

    expect(found).to.be.true;
}

export async function expectTokenTransferWith(bridgeToken: ERC20, from: string, to: string, value: BigNumber) {
    const events = await bridgeToken.queryFilter(bridgeToken.filters.Transfer());
    const found = events.some((event) => {
        return event.args?.from === from && event.args?.to === to && event.args?.value.eq(value);
    });

    expect(found).to.be.true;
}

export async function expectReceivedTimes(safe: GnosisSafeL2Mock, times: number, fromBlock?: number) {
    const events = await safe.queryFilter(safe.filters.Received(), fromBlock);
    expect(events.length).to.equal(times);
}
