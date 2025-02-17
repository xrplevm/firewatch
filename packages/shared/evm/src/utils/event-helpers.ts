import { Contract, BlockTag, LogDescription } from "ethers";

/**
 * Queries the given contract for events with the specified name between optional block ranges,
 * decodes them, and returns an array of decoded event logs.
 *
 * @param contract - An ethers.js Contract instance.
 * @param eventName - The name of the event to query.
 * @param fromBlock - (Optional) The block number/tag to start from.
 * @param toBlock - (Optional) The block number/tag to end at.
 * @returns A promise that resolves to an array of decoded events (LogDescription).
 */
export async function getDecodedEvents(
    contract: Contract,
    eventName: string,
    fromBlock?: BlockTag,
    toBlock?: BlockTag,
): Promise<LogDescription[]> {
    const events = await contract.queryFilter(eventName, fromBlock, toBlock);

    const decodedEvents = events.map((event) => {
        try {
            return contract.interface.parseLog(event);
        } catch {
            return null;
        }
    });

    // Filter out any null values to ensure the returned type is LogDescription[]
    return decodedEvents.filter((e): e is LogDescription => e !== null);
}
