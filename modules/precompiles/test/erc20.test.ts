import { expect } from "chai";
import { erc20PrecompileConfig } from "./erc20.config";
import { ethers } from "hardhat";
import { findEvent, expectRevert, resetOwnerState } from "./testHelpers";
import { bigint } from "hardhat/internal/core/params/argumentTypes";

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
    let abi;
    let contractAddress;
    let ownerContract: InstanceType<typeof ethers.Contract>;
    let userContract: InstanceType<typeof ethers.Contract>;

    let ownerSigner: any;
    let userSigner: any;

    let testTokenAmount: bigint;

    // Notice: user is acting as a faucet, providing the owner with enough tokens
    // to cover transaction fees and execute mint, burn, and transferOwnership tests.
    beforeEach(async () => {
        abi = erc20PrecompileConfig.abi;
        contractAddress = erc20PrecompileConfig.contractAddress;
        [ownerSigner, userSigner] = await ethers.getSigners();

        ownerContract = new ethers.Contract(contractAddress, abi, ownerSigner);
        userContract = new ethers.Contract(contractAddress, abi, userSigner);

        await (await userContract.transfer(ownerSigner.address, erc20PrecompileConfig.feeFund)).wait();

        testTokenAmount = ethers.toBigInt(erc20PrecompileConfig.amount);
    });

    // Notice: This acts as a blockchain state reset by burning all tokens from the owner.
    // Ensures that each test starts with a clean slate for the owner.
    afterEach(async () => {
        await resetOwnerState(ownerContract, userContract, ownerSigner, userSigner);
    });

    describe("mint coins", () => {
        it("should mint tokens to the owner", async () => {
            const beforeBalance = await ownerContract.balanceOf(userSigner.address);

            const mintReceipt = await (await ownerContract.mint(userSigner.address, testTokenAmount)).wait();

            const transferEvent = findEvent(mintReceipt, "Transfer");
            expect(transferEvent).to.not.be.undefined;

            const afterBalance = await ownerContract.balanceOf(userSigner.address);
            expect(afterBalance).to.equal(beforeBalance + testTokenAmount);
        });

        it("should prevent non-owner from minting tokens", async () => {
            await expectRevert(userContract.mint(userSigner.address, testTokenAmount), "ERC20: minter is not the owner");
        });

        it("should revert when attempting to mint 0 tokens", async () => {
            await expectRevert(ownerContract.mint(ownerSigner.address, 0n), "0token: invalid coins");
        });

        describe("burn coins", () => {
            it("should burn specified amount", async () => {
                const beforeBalance = await ownerContract.balanceOf(ownerSigner.address);

                const mintReceipt = await (await ownerContract.mint(ownerSigner.address, testTokenAmount)).wait();

                const mintGasFee = mintReceipt.gasUsed * mintReceipt.gasPrice;

                const burnReceipt = await (await ownerContract.burn(testTokenAmount)).wait();
                const burnGasFee = burnReceipt.gasUsed * burnReceipt.gasPrice;

                const afterBalance = await ownerContract.balanceOf(ownerSigner.address);

                const expectedFinalBalance = beforeBalance - mintGasFee - burnGasFee;
                expect(afterBalance).to.equal(expectedFinalBalance);
            });

            it("should revert if trying to burn more than balance", async () => {
                const beforeBalance = await ownerContract.balanceOf(ownerSigner.address);
                await expectRevert(ownerContract.burn(testTokenAmount + beforeBalance), "ERC20: transfer amount exceeds balance");
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
                await (await ownerContract.mint(userSigner.address, testTokenAmount)).wait();

                const beforeBalance = await ownerContract.balanceOf(userSigner.address);

                await (await ownerContract["burn(address,uint256)"](userSigner.address, testTokenAmount)).wait();

                const afterBalance = await ownerContract.balanceOf(userSigner.address);

                expect(afterBalance).to.equal(beforeBalance - testTokenAmount);
            });

            it("should revert when attempting to burn 0 tokens", async () => {
                await expectRevert(ownerContract.burn(0n), "0token: invalid coins");
            });
        });
    });
    describe("burnFrom", () => {
        it("should revert if spender does not have allowance", async () => {
            await (await ownerContract.mint(userSigner.address, testTokenAmount)).wait();

            await expectRevert(ownerContract.burnFrom(userSigner.address, testTokenAmount), "ERC20: insufficient allowance");
        });

        it("should burn coins if spender has allowance", async () => {
            await (await ownerContract.approve(userSigner.address, testTokenAmount)).wait();

            const initialAllowance = await userContract.allowance(ownerSigner.address, userSigner.address);
            expect(initialAllowance).to.equal(testTokenAmount);

            const beforeBalance = await userContract.balanceOf(ownerSigner.address);

            await (await userContract.burnFrom(ownerSigner.address, testTokenAmount)).wait();

            const afterBalance = await userContract.balanceOf(ownerSigner.address);
            expect(afterBalance).to.equal(beforeBalance - testTokenAmount);

            const finalAllowance = await userContract.allowance(ownerSigner.address, userSigner.address);
            expect(finalAllowance).to.equal(0);
        });
    });

    describe("transferOwnership", () => {
        describe("transferOwnership", () => {
            it("should revert if sender is not the owner", async () => {
                await expectRevert(userContract.transferOwnership(ownerSigner.address), "ERC20: sender is not the owner");
            });

            it("should transfer ownership if sender is owner", async () => {
                await (await ownerContract.transferOwnership(userSigner.address)).wait();

                const newOwner = await ownerContract.owner();
                expect(newOwner).to.equal(userSigner.address);
            });
        });
    });

    describe("increaseAllowance", () => {
        it("should correctly increase allowance", async () => {
            const initialAllowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(initialAllowance).to.equal(0);

            await (await ownerContract.increaseAllowance(userSigner.address, testTokenAmount)).wait();

            const newAllowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(newAllowance).to.equal(initialAllowance + testTokenAmount);
        });
    });

    describe("transfer", () => {
        it("should successfully transfer tokens between accounts", async () => {
            const senderBeforeBalance = await ownerContract.balanceOf(ownerSigner.address);
            const recipientBeforeBalance = await ownerContract.balanceOf(userSigner.address);

            const transferReceipt = await (await ownerContract.transfer(userSigner.address, testTokenAmount)).wait();
            const transferGasFee = BigInt(transferReceipt.gasUsed * transferReceipt.gasPrice);

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
});
