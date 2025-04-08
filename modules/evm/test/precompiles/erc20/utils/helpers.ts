import { ethers } from "hardhat";
import { TransactionReceipt, Log, Interface, Contract } from "ethers";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { executeTx } from "@testing/hardhat/utils";
import BigNumber from "bignumber.js";

/**
 * Resets the owner's contract state by burning tokens and restoring ownership if necessary.
 * @param ownerContract The contract instance connected to the owner signer.
 * @param userContract The contract instance connected to the user signer.
 * @param ownerSigner The owner signer object.
 * @param userSigner The user signer object.
 */
export async function resetLocalnetOwnerState(
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

/**
 * Resets the owner's contract state by burning tokens.
 * @param ownerContract The contract instance connected to the owner signer.
 * @param userContract The contract instance connected to the user signer.
 * @param ownerSigner The owner signer object.
 * @param userSigner The user signer object.
 * @param gasPrice The gasPrice fixed in the contract.
 */
export async function resetLivenetOwnerState(
    ownerContract: Contract,
    userContract: Contract,
    ownerSigner: HardhatEthersSigner,
    userSigner: HardhatEthersSigner,
    gasPrice: string,
): Promise<void> {
    const ownerBalanceBefore: bigint = await ownerContract.balanceOf(ownerSigner.address);

    if (ownerBalanceBefore > 0n) {
        const gasEstimate: bigint = await ownerContract.approve.estimateGas(userSigner.address, ownerBalanceBefore);
        const adjustedGasEstimate = new BigNumber(gasEstimate.toString()).multipliedBy(1.0005).integerValue(BigNumber.ROUND_CEIL);
        const priceBN = new BigNumber(gasPrice);
        const cost = adjustedGasEstimate.multipliedBy(priceBN);
        const burnAmount: bigint = ownerBalanceBefore - BigInt(cost.toFixed(0));

        if (burnAmount < 0n) {
            return;
        }

        await executeTx(ownerContract.approve(userSigner.address, burnAmount));
        await executeTx(userContract.burnFrom(ownerSigner.address, burnAmount));

        const ownerBalanceAfter: bigint = await ownerContract.balanceOf(ownerSigner.address);
        const remainingAllowance: bigint = await ownerContract.allowance(ownerSigner.address, userSigner.address);

        expect(ownerBalanceAfter).to.be.at.most(30000000000000n);
        expect(remainingAllowance).to.be.at.most(30000000000000n);
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
    expect(eventLog, "Transfer event not found").to.not.be.an("undefined");

    const decoded = iface.parseLog(eventLog!);
    expect(decoded!.args.from).to.equal(expectedFrom);
    expect(decoded!.args.to).to.equal(expectedTo);
    expect(decoded!.args.value).to.equal(expectedValue);
}
