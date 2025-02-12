import { expect } from "chai";
import { erc20PrecompileConfig } from "./erc20.config";
import { ethers } from "hardhat";
import { expectRevert, resetOwnerState, assertTransferEvent, executeTx, findEvent } from "./testHelpers";
import { Interface } from "ethers";

/**
 * Test Context:
 *
 * 1. **Double Await Pattern**:
 *    - Using the double await pattern because these tests are run on a dev blockchain.
 *    - Transactions must be confirmed on-chain before proceeding to the next operation.
 *
 * 2. **Gas Calculations**:
 *    - Gas calculations are performed because this ERC20 serves as the native token of the chain.
 */

describe("ERC20", () => {
    let abi: any;
    let contractInterface: Interface;
    let contractAddress: string;
    let ownerContract: InstanceType<typeof ethers.Contract>;
    let userContract: InstanceType<typeof ethers.Contract>;

    let ownerSigner: any;
    let userSigner: any;

    let testTokenAmount: bigint;

    // Notice: user is acting as a faucet, providing the owner with enough tokens
    // to cover transaction fees and execute mint, burn, and transferOwnership tests.
    beforeEach(async () => {
        abi = erc20PrecompileConfig.abi;
        contractInterface = erc20PrecompileConfig.interface;
        contractAddress = erc20PrecompileConfig.contractAddress;
        [ownerSigner, userSigner] = await ethers.getSigners();

        ownerContract = new ethers.Contract(contractAddress, abi, ownerSigner);
        userContract = new ethers.Contract(contractAddress, abi, userSigner);

        await (await userContract.transfer(ownerSigner.address, erc20PrecompileConfig.feeFund)).wait();

        testTokenAmount = erc20PrecompileConfig.amount;
    });

    // Notice: This acts as a blockchain state reset by burning all tokens from the owner.
    // Ensures that each test starts with a clean slate for the owner.
    afterEach(async () => {
        await resetOwnerState(ownerContract, userContract, ownerSigner, userSigner);
    });

    describe("mint coins", () => {
        it("should mint tokens to the owner", async () => {
            const beforeBalance = await ownerContract.balanceOf(userSigner.address);

            const { receipt: mintReceipt } = await executeTx(ownerContract.mint(userSigner.address, testTokenAmount));

            assertTransferEvent(mintReceipt, ethers.ZeroAddress, userSigner.address, testTokenAmount, contractInterface);

            const afterBalance = await ownerContract.balanceOf(userSigner.address);
            expect(afterBalance).to.equal(beforeBalance + testTokenAmount);
        });

        it("should prevent non-owner from minting tokens", async () => {
            await expectRevert(userContract.mint(userSigner.address, testTokenAmount), "ERC20: minter is not the owner");
        });

        it("should revert when attempting to mint 0 tokens", async () => {
            await expectRevert(ownerContract.mint(ownerSigner.address, 0n), "0token: invalid coins");
        });
    });

    describe("burn coins", () => {
        it("should burn specified amount", async () => {
            const beforeBalance = await ownerContract.balanceOf(ownerSigner.address);

            // Mint tokens to owner.
            const { receipt: mintReceipt, gasCost: mintGasFee } = await executeTx(ownerContract.mint(ownerSigner.address, testTokenAmount));

            // Burn the tokens.
            const { receipt: burnReceipt, gasCost: burnGasFee } = await executeTx(ownerContract.burn(testTokenAmount));

            const afterBalance = await ownerContract.balanceOf(ownerSigner.address);
            const expectedFinalBalance = beforeBalance - mintGasFee - burnGasFee;
            expect(afterBalance).to.equal(expectedFinalBalance);
        });

        it("should revert if trying to burn more than balance", async () => {
            const beforeBalance = await ownerContract.balanceOf(ownerSigner.address);
            await expectRevert(ownerContract.burn(testTokenAmount + beforeBalance), "ERC20: transfer amount exceeds balance");
        });
        it("should revert when attempting to burn 0 tokens", async () => {
            await expectRevert(ownerContract.burn(0n), "0token: invalid coins");
        });
    });

    describe("burn (owner-only burn)", () => {
        it("should revert if sender is not owner", async () => {
            await expectRevert(
                userContract["burn(address,uint256)"](ownerSigner.address, testTokenAmount),
                "ERC20: sender is not the owner",
            );
        });

        it("should burn coins of spender if sender is owner", async () => {
            await executeTx(ownerContract.mint(userSigner.address, testTokenAmount));
            const beforeBalance = await ownerContract.balanceOf(userSigner.address);

            await executeTx(ownerContract["burn(address,uint256)"](userSigner.address, testTokenAmount));

            const afterBalance = await ownerContract.balanceOf(userSigner.address);
            expect(afterBalance).to.equal(beforeBalance - testTokenAmount);
        });
    });

    describe("burnFrom", () => {
        it("should revert if spender does not have allowance", async () => {
            await executeTx(ownerContract.mint(userSigner.address, testTokenAmount));

            await expectRevert(ownerContract.burnFrom(userSigner.address, testTokenAmount), "ERC20: insufficient allowance");
        });

        it("should burn coins if spender has allowance", async () => {
            await executeTx(ownerContract.approve(userSigner.address, testTokenAmount));

            const initialAllowance = await userContract.allowance(ownerSigner.address, userSigner.address);
            expect(initialAllowance).to.equal(testTokenAmount);

            const beforeBalance = await userContract.balanceOf(ownerSigner.address);

            await executeTx(userContract.burnFrom(ownerSigner.address, testTokenAmount));

            const afterBalance = await userContract.balanceOf(ownerSigner.address);
            expect(afterBalance).to.equal(beforeBalance - testTokenAmount);

            const finalAllowance = await userContract.allowance(ownerSigner.address, userSigner.address);
            expect(finalAllowance).to.equal(0n);
        });
    });

    describe("transferOwnership", () => {
        it("should revert if sender is not the owner", async () => {
            await expectRevert(userContract.transferOwnership(ownerSigner.address), "ERC20: sender is not the owner");
        });

        it("should transfer ownership if sender is owner", async () => {
            await executeTx(ownerContract.transferOwnership(userSigner.address));
            const newOwner = await ownerContract.owner();
            expect(newOwner).to.equal(userSigner.address);
        });
    });

    describe("increaseAllowance", () => {
        it("should correctly increase allowance", async () => {
            const initialAllowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(initialAllowance).to.equal(0);

            await executeTx(ownerContract.increaseAllowance(userSigner.address, testTokenAmount));

            const newAllowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(newAllowance).to.equal(initialAllowance + testTokenAmount);
        });
    });

    describe("transfer", () => {
        it("should successfully transfer tokens between accounts", async () => {
            const senderBeforeBalance = await ownerContract.balanceOf(ownerSigner.address);
            const recipientBeforeBalance = await ownerContract.balanceOf(userSigner.address);

            const { receipt: transferReceipt, gasCost: transferGasFee } = await executeTx(
                ownerContract.transfer(userSigner.address, testTokenAmount),
            );

            const senderAfterBalance = await ownerContract.balanceOf(ownerSigner.address);
            const recipientAfterBalance = await ownerContract.balanceOf(userSigner.address);

            expect(senderBeforeBalance - testTokenAmount - transferGasFee).to.equal(senderAfterBalance);
            expect(recipientBeforeBalance + testTokenAmount).to.equal(recipientAfterBalance);
        });

        it("should revert if sender has insufficient balance", async () => {
            await expectRevert(ownerContract.transfer(userSigner.address, 10000000000000000000n), "ERC20: transfer amount exceeds balance");
        });

        it("should revert when attempting to transfer 0 tokens", async () => {
            await expectRevert(ownerContract.transfer(userSigner.address, 0n), "coin 0token amount is not positive");
        });
    });

    // TODO failing test, seems like Approval param owner is set to address.this instead msg.address.
    describe("approve", () => {
        it("should set and reset the allowance correctly and emit Approval events", async () => {
            // Approve the spender (userSigner) for testTokenAmount.
            const approveTx = await ownerContract.approve(userSigner.address, testTokenAmount);
            const approveReceipt = await approveTx.wait();

            // Verify the allowance was set correctly.
            let allowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(allowance).to.equal(testTokenAmount);

            // Check the Approval event.
            const approvalEvent = findEvent(approveReceipt, contractInterface, "Approval");
            expect(approvalEvent).to.not.be.undefined;
            expect(approvalEvent![0]).to.equal(ownerSigner.address); // Owner
            expect(approvalEvent![1]).to.equal(userSigner.address); // Spender
            expect(approvalEvent![2].toString()).to.equal(testTokenAmount.toString()); // Amount

            // Approve 0 to reset the allowance.
            const resetApproveTx = await ownerContract.approve(userSigner.address, 0n);
            const resetApproveReceipt = await resetApproveTx.wait();

            // Verify the allowance was reset.
            allowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(allowance).to.equal(0n);

            // Check the Approval event for resetting the allowance.
            const resetApprovalEvent = findEvent(resetApproveReceipt, contractInterface, "Approval");
            expect(resetApprovalEvent).to.not.be.undefined;
            expect(resetApprovalEvent![0]).to.equal(ownerSigner.address); // Owner
            expect(resetApprovalEvent![1]).to.equal(userSigner.address); // Spender
            expect(resetApprovalEvent![2].toString()).to.equal("0"); // Reset Amount
        });
    });
});
