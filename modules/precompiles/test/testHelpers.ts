import { ethers } from "hardhat";
import { expect } from "chai";

/**
 * Finds an event in the transaction receipt logs.
 * @param receipt The transaction receipt object.
 * @param eventName The name of the event to find.
 * @returns The event log if found, otherwise undefined.
 */
export const findEvent = (receipt: any, eventName: string) => {
    const eventHash = ethers.id(`${eventName}(address,address,uint256)`);
    return receipt.logs.find((log: { topics: string[] }) => log.topics[0] === eventHash);
};

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

// In testHelpers.ts
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
