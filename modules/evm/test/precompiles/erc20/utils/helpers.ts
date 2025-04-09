import { ethers } from "hardhat";
import { TransactionReceipt, Log, Interface, Contract } from "ethers";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { executeTx } from "@testing/hardhat/utils";
import BigNumber from "bignumber.js";

/**
 * Resets the owner's contract state based on the network environment.
 *
 * If chainEvn is "localnet":
 *   - Burns tokens and restores ownership if necessary.
 *
 * Otherwise:
 *   - Burns tokens by calculating gas estimates and adjusts the transfer amount.
 *
 * @param ownerContract The contract instance connected to the owner signer.
 * @param userContract The contract instance connected to the user signer.
 * @param ownerSigner The owner signer object.
 * @param userSigner The user signer object.
 * @param chainEvn A string indicating the network environment ("localnet" for local, otherwise live).
 * @param gasPrice (Optional) The gas price used by the livenet branch.
 */
export async function resetOwnerState(
    ownerContract: Contract,
    userContract: Contract,
    ownerSigner: HardhatEthersSigner,
    userSigner: HardhatEthersSigner,
    chainEvn: string,
    gasPrice: string,
): Promise<void> {
    if (chainEvn === "localnet") {
        const currentOwner = await ownerContract.owner();
        const ownerBalance: bigint = await ownerContract.balanceOf(ownerSigner.address);

        if (ownerBalance <= 0n) {
            return;
        }

        const burnGasEstimate: bigint = await userContract.approve.estimateGas(ownerSigner.address, ownerBalance);
        const exactApprovalAmount: bigint = ownerBalance - burnGasEstimate;

        await executeTx(ownerContract.approve(userSigner.address, exactApprovalAmount));
        await executeTx(userContract.transferFrom(ownerSigner.address, userSigner.address, exactApprovalAmount));

        const ownerBalanceAfterBurn: bigint = await ownerContract.balanceOf(ownerSigner.address);
        const allowanceAfterBurn: bigint = await ownerContract.allowance(ownerSigner.address, userSigner.address);

        expect(ownerBalanceAfterBurn).to.equal(0n);
        expect(allowanceAfterBurn).to.equal(0n);

        if (currentOwner !== ownerSigner.address) {
            await executeTx(userContract.transferOwnership(ownerSigner.address));
        }
    } else {
        const ownerBalance: bigint = await ownerContract.balanceOf(ownerSigner.address);

        if (ownerBalance <= 0n) {
            return;
        }

        const gasEstimate: bigint = await ownerContract.approve.estimateGas(userSigner.address, ownerBalance);
        const adjustedGasEstimate = new BigNumber(gasEstimate.toString()).multipliedBy(1.0005).integerValue(BigNumber.ROUND_CEIL);
        const priceBN = new BigNumber(gasPrice);
        const cost = adjustedGasEstimate.multipliedBy(priceBN);
        const finalCost = BigInt(cost.toFixed(0));
        const transferAmount: bigint = ownerBalance - finalCost;

        if (transferAmount < 0n) {
            return;
        }

        await executeTx(ownerContract.approve(userSigner.address, transferAmount));
        await executeTx(userContract.transferFrom(ownerSigner.address, userSigner.address, transferAmount));

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
