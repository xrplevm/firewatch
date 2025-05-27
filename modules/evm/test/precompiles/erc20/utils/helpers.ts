import { ethers } from "hardhat";
import { TransactionReceipt, Log, Interface, Contract, formatEther } from "ethers";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { executeTx } from "@testing/hardhat/utils";
import BigNumber from "bignumber.js";

/**
 * Resets the owner's contract state. Transferring tokens back to "faucet account".
 * For "localnet", restores ownership if needed.
 * @param ownerContract Contract instance for the owner.
 * @param userContract Contract instance for user operations.
 * @param ownerSigner Owner signer.
 * @param userSigner User signer.
 * @param chainEvn Network environment.
 */
export async function resetOwnerState(
    ownerContract: Contract,
    userContract: Contract,
    ownerSigner: HardhatEthersSigner,
    userSigner: HardhatEthersSigner,
    chainEvn: string,
): Promise<void> {
    const ownerBalance: bigint = await ownerContract.balanceOf(ownerSigner.address);
    if (ownerBalance <= 0n) return;

    if (chainEvn === "localnet") {
        const currentOwner = await ownerContract.owner();
        if (currentOwner !== ownerSigner.address) {
            await executeTx(userContract.transferOwnership(ownerSigner.address));
        }
    }

    const provider = ethers.provider;
    const gas = await provider.getFeeData();
    const burnGasEstimate: string = (await userContract.approve.estimateGas(ownerSigner.address, ownerBalance)).toString();

    const gasPriceBN = chainEvn === "localnet" ? new BigNumber("1") : new BigNumber(gas.gasPrice!.toString());

    const gasUsedBN = new BigNumber(burnGasEstimate);
    const gasCostCalculatedBN = gasPriceBN.multipliedBy(gasUsedBN);
    const gasCostCalculated = BigInt(gasCostCalculatedBN.toFixed(0));
    const transferAmount: bigint = ownerBalance - gasCostCalculated;

    if (transferAmount < 0n) return;

    const approveTx = await executeTx(ownerContract.approve(userSigner.address, transferAmount));
    const realGasUsed = approveTx.gasCost;

    await executeTx(userContract.transferFrom(ownerSigner.address, userSigner.address, transferAmount));

    const ownerBalanceAfter: bigint = await ownerContract.balanceOf(ownerSigner.address);
    const remainingAllowance: bigint = await ownerContract.allowance(ownerSigner.address, userSigner.address);
    const expectedRemainingBalance = gasCostCalculated - BigInt(realGasUsed);

    expect(ownerBalanceAfter).to.equal(expectedRemainingBalance);
    expect(remainingAllowance).to.equal(0n);
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
