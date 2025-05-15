import { Contract, BlockTag, LogDescription, TransactionReceipt, Interface, EventLog } from "ethers";
import { PollingOptions, polling } from "@shared/utils";
import { ExtendedEventLog } from "../types";

/**
 * Queries the given contract for an event.
 * @param contract An ethers.js Contract instance.
 * @param eventName The name of the event to query.
 * @param fromBlock The block number/tag to start from (Optional).
 * @param toBlock The block number/tag to end at (Optional).
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
 * @param contract An ethers.js Contract instance.
 * @param eventName The name of the event to query.
 * @param filterFn A predicate function used to identify the desired event.
 * @param pollingOpts Polling options.
 * @param fromBlock The starting block tag (Optional).
 * @param toBlock The ending block tag (Optional).
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

/**
 * Finds and decodes an event with a specified name from the transaction receipt logs.
 * @param receipt The transaction receipt containing logs.
 * @param iface An ethers Interface instance for the contract.
 * @param eventName The name of the event to find.
 * @returns An ExtendedEventLog for the matching event, or undefined if not found.
 */
export function findEvent<T = unknown>(receipt: TransactionReceipt, iface: Interface, eventName: string): ExtendedEventLog<T> | undefined {
    for (const log of receipt.logs) {
        try {
            const parsedLog = iface.parseLog(log);
            if (parsedLog!.name === eventName) {
                const eventLog = new EventLog(log, iface, parsedLog!.fragment);
                const decodedArgs: Record<string, T> = {};
                parsedLog!.fragment.inputs.forEach((input, index) => {
                    decodedArgs[input.name] = eventLog.args[index] as T;
                });

                return Object.assign(eventLog, { decodedArgs });
            }
        } catch {}
    }
    return undefined;
}

/**
 * Returns the decoded event arguments for the first log matching the specified event name.
 * @param receipt The transaction receipt containing logs.
 * @param iface An ethers Interface instance for the contract.
 * @param eventName The name of the event to look for.
 * @returns The event arguments (with keys for parameter names), or undefined if not found.
 */
export function getEventArgs(receipt: TransactionReceipt, iface: Interface, eventName: string): LogDescription | undefined {
    for (const log of receipt.logs) {
        try {
            const parsedLog = iface.parseLog(log);
            if (parsedLog !== null && parsedLog.name === eventName) {
                return parsedLog;
            }
        } catch {}
    }
    return undefined;
}

/**
 * Finds the log index of the first event with the specified name in the transaction receipt.
 * @param receipt The transaction receipt containing logs.
 * @param iface An ethers Interface instance for the contract.
 * @param eventName The name of the event to find.
 * @returns The log index (number) if found, otherwise undefined.
 */
export function findLogIndex(
    receipt: TransactionReceipt,
    abi: Array<string | Record<string, any>>, // plain ABI
    eventName: string,
): number | undefined {
    const iface = new Interface(abi);
    for (const log of receipt.logs) {
        try {
            const parsed = iface.parseLog(log);
            if (parsed && parsed.name === eventName) {
                return (log as any).index;
            }
        } catch {}
    }
    return undefined;
}
