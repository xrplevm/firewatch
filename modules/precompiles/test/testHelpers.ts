import { ethers } from "hardhat";
import { Log, Interface } from "ethers";
import { expect } from "chai";

/**
 * Asserts that a transaction reverts with a specific error message.
 * @param tx The transaction promise that should revert.
 * @param expectedError The expected revert error message.
 */
export const expectRevert = async (tx: Promise<any>, expectedError: string) => {
    try {
        await tx;
        expect.fail(`Expected transaction to revert with '${expectedError}', but it did not`);
    } catch (error: any) {
        // console.log("Full error message:", error);
        expect(error.message).to.contain(expectedError);
    }
};

/**
 * @param ownerContract The contract instance connected to the owner signer.
 * @param userContract The contract instance connected to the user signer.
 * @param ownerSigner The owner signer object.
 * @param userSigner The user signer object.
 */
export async function resetOwnerState(
    ownerContract: InstanceType<typeof ethers.Contract>,
    userContract: InstanceType<typeof ethers.Contract>,
    ownerSigner: any,
    userSigner: any,
) {
    const currentOwner = await ownerContract.owner();
    const ownerBalance = await ownerContract.balanceOf(ownerSigner.address);
    if (ownerBalance > 0) {
        const burnGasEstimate = await userContract.approve.estimateGas(ownerSigner.address, ownerBalance);
        const exactApprovalAmount = ownerBalance - burnGasEstimate;
        await (await ownerContract.approve(userSigner.address, exactApprovalAmount)).wait();
        await (await userContract.burnFrom(ownerSigner.address, exactApprovalAmount)).wait();
    }
    if (currentOwner !== ownerSigner.address) {
        await (await userContract.transferOwnership(ownerSigner.address)).wait();
    }
}

/**
 * Finds and decodes an event with a specified name from the transaction receipt logs.
 * @param receipt The transaction receipt containing logs.
 * @param iface An ethers Interface instance for the contract.
 * @param eventName The name of the event to find.
 * @returns A plain array of decoded event arguments if the event is found; otherwise, undefined.
 */
export const findEvent = (receipt: { logs: Log[] }, iface: Interface, eventName: string): any[] | undefined => {
    for (const log of receipt.logs) {
        const parsedLog = iface.parseLog(log);
        if (parsedLog?.fragment.name === eventName) {
            return Array.from(parsedLog.args);
        }
    }
    return undefined;
};

/**
 * Asserts that a Transfer event was emitted with the expected parameters.
 * @param receipt The transaction receipt containing logs.
 * @param expectedFrom The expected sender address (use the zero address for mint events).
 * @param expectedTo The expected recipient address.
 * @param expectedValue The expected token amount (as bigint).
 * @param iface An ethers Interface instance for the contract.
 */
export function assertTransferEvent(receipt: any, expectedFrom: string, expectedTo: string, expectedValue: bigint, iface: Interface) {
    const eventSig = ethers.id("Transfer(address,address,uint256)");

    const eventLog = receipt.logs.find((log: any) => log.topics[0] === eventSig);
    expect(eventLog, "Transfer event not found").to.not.be.undefined;

    const decoded = iface.parseLog(eventLog);
    expect(decoded?.args.from).to.equal(expectedFrom);
    expect(decoded?.args.to).to.equal(expectedTo);
    expect(decoded?.args.value).to.equal(expectedValue);
}

/**
 * Executes a transaction, waits for its confirmation, and calculates the gas cost.
 * @param txPromise A promise that resolves to a transaction response.
 * @returns An object containing the receipt and the gas cost (as a bigint).
 */
export async function executeTx(txPromise: Promise<any>): Promise<{ receipt: any; gasCost: bigint }> {
    const tx = await txPromise; // send the transaction
    const receipt = await tx.wait(); // wait for on-chain confirmation
    // Calculate gas cost: gasUsed * gasPrice.
    // (Note: This assumes gasPrice is available in the receipt.)
    const gasCost = BigInt(receipt.gasUsed * receipt.gasPrice);
    return { receipt, gasCost };
}
