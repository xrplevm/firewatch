import { TransactionReceipt, Interface, LogDescription, EventLog } from "ethers";
import { ExtendedEventLog } from "@shared/evm/types";

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
