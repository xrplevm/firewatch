import { ethers } from "hardhat";
import { TransactionReceipt, Log, Interface, Contract } from "ethers";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { executeTx } from "@testing/hardhat/utils";

/**
 * Resets the owner's contract state. Transferring tokens back to "faucet account".
 * For "localnet", restores ownership if needed.
 *   1. Check owner balance — if the owner has no tokens, nothing to clean up, return early
 *   2. Restore ownership (localnet only) — if a test transferred ownership away from the owner (e.g.
 *   the transferOwnership tests), it transfers it back.
 *   3. Approve full balance — the owner approves the user to spend their entire token balance. After
 *   this tx, the owner's balance is slightly less (gas cost deducted).
 *   4. Query actual remaining balance — instead of estimating gas, it reads the real post-approve
 *   balance. This is the exact amount safe to transfer.
 *   5. Transfer back to user — the user calls transferFrom to pull all remaining tokens from the
 *   owner back to themselves (acting as the "faucet").
 *   6. Assert owner balance is 0 — verifies the cleanup work
 * @param contractAsOwner Contract instance connected with the owner signer.
 * @param contractAsUser Contract instance connected with the user signer.
 * @param ownerSigner Owner signer.
 * @param userSigner User signer.
 * @param chainEvn Network environment.
 */
export async function resetOwnerState(
    contractAsOwner: Contract,
    contractAsUser: Contract,
    ownerSigner: HardhatEthersSigner,
    userSigner: HardhatEthersSigner,
): Promise<void> {
    const ownerBalance: bigint = await contractAsOwner.balanceOf(ownerSigner.address);
    if (ownerBalance <= 0n) return;

    // Approve the full balance.
    await executeTx(contractAsOwner.approve(userSigner.address, ownerBalance));

    // Query the actual remaining balance after the approve gas cost was deducted.
    const transferAmount: bigint = await contractAsOwner.balanceOf(ownerSigner.address);
    if (transferAmount <= 0n) return;

    await executeTx(contractAsUser.transferFrom(ownerSigner.address, userSigner.address, transferAmount));

    const ownerBalanceAfter: bigint = await contractAsOwner.balanceOf(ownerSigner.address);
    expect(ownerBalanceAfter).to.equal(0n);
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
