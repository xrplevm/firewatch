import { Contract, BlockTag, LogDescription } from "ethers";
import { PollingOptions, polling } from "@shared/utils";

/**
 * Queries the given contract for an event
 *
 * @param contract - An ethers.js Contract instance.
 * @param eventName - The name of the event to query.
 * @param fromBlock - (Optional) The block number/tag to start from.
 * @param toBlock - (Optional) The block number/tag to end at.
 * @returns A promise that resolves to an array of decoded events (LogDescription).
 */
export async function getContractDecodedEvents(
    contract: Contract,
    eventName: string,
    fromBlock?: BlockTag,
    toBlock?: BlockTag,
): Promise<LogDescription[]> {
    const events = await contract.queryFilter(eventName, fromBlock, toBlock);

    return events.map((event) => contract.interface.parseLog(event)!);
}

/**
 * Polls for a specific event on a contract using a filter function.
 *
 * @param contract - An ethers.js Contract instance.
 * @param eventName - The name of the event to query.
 * @param fromBlock - The starting block tag.
 * @param toBlock - The ending block tag.
 * @param filterFn - A predicate function used to identify the desired event.
 * @param pollingOpts - Polling options.
 * @returns A promise that resolves to the found event or undefined if not found.
 */
export async function pollForEvent<T extends LogDescription>(
    contract: Contract,
    eventName: string,
    filterFn: (decoded: T) => boolean,
    pollingOpts: PollingOptions,
    fromBlock?: BlockTag,
    toBlock?: BlockTag,
): Promise<T | undefined> {
    let eventFound: T | undefined;
    await polling(
        async () => {
            const decodedEvents = (await getContractDecodedEvents(contract, eventName, fromBlock, toBlock)) as T[];
            eventFound = decodedEvents.find(filterFn);
            return Boolean(eventFound);
        },
        (result: boolean) => !result,
        pollingOpts,
    );
    return eventFound;
}
