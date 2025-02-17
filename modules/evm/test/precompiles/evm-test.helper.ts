import { ethers } from "hardhat";
import { TransactionReceipt, Log, Interface, LogDescription, TransactionResponse, EventLog, Contract, ContractTransaction } from "ethers";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Asserts that a transaction reverts with a specific error message.
 * @param tx The transaction promise that should revert.
 * @param expectedError The expected revert error message.
 */
export async function expectRevert(tx: Promise<ContractTransaction>, expectedError: string): Promise<void> {
    try {
        await tx;
        expect.fail(`Expected transaction to revert with '${expectedError}', but it did not`);
    } catch (error: unknown) {
        expect((error as Error).message).to.contain(expectedError);
    }
}

/**
 * @param ownerContract The contract instance connected to the owner signer.
 * @param userContract The contract instance connected to the user signer.
 * @param ownerSigner The owner signer object.
 * @param userSigner The user signer object.
 */
export async function resetOwnerState(
    ownerContract: Contract,
    userContract: Contract,
    ownerSigner: HardhatEthersSigner,
    userSigner: HardhatEthersSigner,
) {
    const currentOwner = await ownerContract.owner();
    const ownerBalance: bigint = await ownerContract.balanceOf(ownerSigner.address);
    if (ownerBalance > 0n) {
        const burnGasEstimate: bigint = await userContract.approve.estimateGas(ownerSigner.address, ownerBalance);
        const exactApprovalAmount: bigint = ownerBalance - burnGasEstimate;

        await executeTx(ownerContract.approve(userSigner.address, exactApprovalAmount));
        await executeTx(userContract.burnFrom(ownerSigner.address, exactApprovalAmount));

        const ownerBalanceAfterBurn: bigint = await ownerContract.balanceOf(ownerSigner.address);
        const allowanceAfterBurn: bigint = await ownerContract.allowance(ownerSigner.address, userSigner.address);

        expect(ownerBalanceAfterBurn).to.equal(0n);
        expect(allowanceAfterBurn).to.equal(0n);
    }
    if (currentOwner !== ownerSigner.address) {
        await executeTx(userContract.transferOwnership(ownerSigner.address));
    }
}

export interface ExtendedEventLog<T = unknown> extends EventLog {
    decodedArgs: Record<string, T>;
}

/**
 * Finds and decodes an event with a specified name from the transaction receipt logs,
 * returning an instance of your custom EventLog (augmented with a `decodedArgs` property).
 *
 * @param receipt - The transaction receipt containing logs.
 * @param iface - An ethers Interface instance for the contract.
 * @param eventName - The name of the event to find.
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
                const extendedEventLog: ExtendedEventLog<T> = Object.assign(eventLog, { decodedArgs });
                return extendedEventLog;
            }
        } catch {
            // ignore logs that don't parse correctly
        }
    }
    return undefined;
}

/**
 * Returns the decoded event arguments for the first log matching the specified event name.
 * @param receipt - The transaction receipt containing logs.
 * @param iface - An ethers Interface instance for the contract.
 * @param eventName - The name of the event to look for.
 * @returns The event arguments (with keys for parameter names), or undefined if not found.
 */
export function getEventArgs(receipt: TransactionReceipt, iface: Interface, eventName: string): LogDescription | undefined {
    for (const log of receipt.logs) {
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
}
/**
 * Asserts that a Transfer event was emitted with the expected parameters.
 * @param receipt The transaction receipt containing logs.
 * @param expectedFrom The expected sender address (use the zero address for mint events).
 * @param expectedTo The expected recipient address.
 * @param expectedValue The expected token amount (as bigint).
 * @param iface An ethers Interface instance for the contract.
 */
export function expectTransferEvent(
    receipt: TransactionReceipt,
    expectedFrom: string,
    expectedTo: string,
    expectedValue: bigint,
    iface: Interface,
) {
    const eventSig = ethers.id("Transfer(address,address,uint256)");

    const eventLog = receipt.logs.find((log: Log) => log.topics[0] === eventSig);
    expect(eventLog, "Transfer event not found").to.not.be.undefined;

    const decoded = iface.parseLog(eventLog!);
    expect(decoded!.args.from).to.equal(expectedFrom);
    expect(decoded!.args.to).to.equal(expectedTo);
    expect(decoded!.args.value).to.equal(expectedValue);
}

/**
 * Executes a transaction, waits for its confirmation, and calculates the gas cost.
 * @param txPromise A promise that resolves to a transaction response.
 * @returns An object containing the receipt and the gas cost (as a bigint).
 */
export async function executeTx(txPromise: Promise<TransactionResponse>): Promise<{ receipt: TransactionReceipt; gasCost: bigint }> {
    const tx = await txPromise;
    const receipt = await tx.wait();

    if (!receipt) {
        throw new Error("Transaction receipt is null. The transaction might not have been mined yet.");
    }

    const gasCost = receipt.gasUsed * receipt.gasPrice;
    return { receipt, gasCost };
}
