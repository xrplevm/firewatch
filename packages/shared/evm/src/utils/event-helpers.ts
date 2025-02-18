import { Contract, BlockTag, LogDescription } from "ethers";

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
