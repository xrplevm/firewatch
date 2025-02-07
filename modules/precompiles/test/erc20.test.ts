import { expect } from "chai";
import { erc20PrecompileConfig } from "./erc20.config";
import { ethers } from "hardhat";
import { findEvent, expectRevert } from "./testHelpers";

// Notice: Using the double await pattern because we are testing on a live blockchain.
// Transactions are asynchronous, and we must ensure they are fully confirmed on-chain before proceeding.
// The first await sends the transaction, and the second await (tx.wait()) waits for it to be mined.
describe("ERC20", () => {
    let abi;
    let contractAddress;
    let ownerContract: InstanceType<typeof ethers.Contract>;
    let userContract: InstanceType<typeof ethers.Contract>;

    let ownerSigner: any;
    let userSigner: any;

    let burnMintAmount: bigint;

    beforeEach(async () => {
        abi = erc20PrecompileConfig.abi;
        contractAddress = erc20PrecompileConfig.contractAddress;
        [ownerSigner, userSigner] = await ethers.getSigners();

        ownerContract = new ethers.Contract(contractAddress, abi, ownerSigner);
        userContract = new ethers.Contract(contractAddress, abi, userSigner);

        burnMintAmount = ethers.toBigInt(erc20PrecompileConfig.amount);
    });

    describe("mint coins", () => {
        it("should mint tokens to the owner", async () => {
            const beforeBalance = await ownerContract.balanceOf(userSigner.address);

            const mintReceipt = await (await ownerContract.mint(userSigner.address, burnMintAmount)).wait();

            const transferEvent = findEvent(mintReceipt, "Transfer");
            expect(transferEvent).to.not.be.undefined;

            const afterBalance = await ownerContract.balanceOf(userSigner.address);
            expect(afterBalance).to.equal(beforeBalance + burnMintAmount);
        });

        it("should prevent non-owner from minting tokens", async () => {
            await expectRevert(userContract.mint(userSigner.address, burnMintAmount), "ERC20: minter is not the owner");
        });
    });

    describe("burn coins", () => {
        it("should burn specified amount", async () => {
            const beforeBalance = await ownerContract.balanceOf(ownerSigner.address);

            const mintReceipt = await (await ownerContract.mint(ownerSigner.address, burnMintAmount)).wait();

            const mintGasFee = mintReceipt.gasUsed * mintReceipt.gasPrice;

            const burnReceipt = await (await ownerContract.burn(burnMintAmount)).wait();
            const burnGasFee = burnReceipt.gasUsed * burnReceipt.gasPrice;

            const afterBurnBalance = await ownerContract.balanceOf(ownerSigner.address);

            const expectedFinalBalance = beforeBalance - mintGasFee - burnGasFee;
            expect(afterBurnBalance).to.equal(expectedFinalBalance);
        });

        it("should revert if trying to burn more than balance", async () => {
            await expectRevert(ownerContract.burn(burnMintAmount), "ERC20: transfer amount exceeds balance");
        });
    });

    describe("burn (owner-only burn)", () => {
        it("should revert if sender is not owner", async () => {
            await expectRevert(
                userContract["burn(address,uint256)"](ownerSigner.address, burnMintAmount),
                "ERC20: sender is not the owner",
            );
        });

        it("should burn coins of spender if sender is owner", async () => {
            await (await ownerContract.mint(userSigner.address, burnMintAmount)).wait();

            const beforeBalance = await ownerContract.balanceOf(userSigner.address);

            await (await ownerContract["burn(address,uint256)"](userSigner.address, burnMintAmount)).wait();

            const afterBalance = await ownerContract.balanceOf(userSigner.address);

            expect(afterBalance).to.equal(beforeBalance - burnMintAmount);
        });
    });

    describe("burnFrom", () => {
        it("should revert if spender does not have allowance", async () => {
            await (await ownerContract.mint(userSigner.address, burnMintAmount)).wait();

            await expectRevert(ownerContract.burnFrom(userSigner.address, burnMintAmount), "ERC20: insufficient allowance");
        });

        it("should burn coins if spender has allowance", async () => {
            await (await ownerContract.mint(ownerSigner.address, burnMintAmount)).wait();

            await (await ownerContract.approve(userSigner.address, burnMintAmount)).wait();

            const initialAllowance = await userContract.allowance(ownerSigner.address, userSigner.address);
            expect(initialAllowance).to.equal(burnMintAmount);

            const beforeBalance = await userContract.balanceOf(ownerSigner.address);

            await (await userContract.burnFrom(ownerSigner.address, burnMintAmount)).wait();

            const afterBalance = await userContract.balanceOf(ownerSigner.address);
            expect(afterBalance).to.equal(beforeBalance - burnMintAmount);

            const finalAllowance = await userContract.allowance(ownerSigner.address, userSigner.address);
            expect(finalAllowance).to.equal(0);
        });
    });
});
