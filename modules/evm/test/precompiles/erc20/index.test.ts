import { expect } from "chai";
import { ethers } from "hardhat";
import { resetOwnerState, expectTransferEvent } from "./utils/helpers";
import { Interface, toBigInt, Contract } from "ethers";
import { ERC20Errors } from "../../../src/precompiles/erc20/errors/errors";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expectRevert, executeTx } from "@testing/hardhat/utils";
import moduleConfig from "../../../module.config.example.json";
import { getEventArgs } from "@shared/evm/utils";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { Chain } from "@firewatch/core/chain";

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
    let abi: string[];
    let contractInterface: Interface;
    let contractAddress: string;
    let ownerContract: Contract;
    let userContract: Contract;

    let ownerSigner: HardhatEthersSigner;
    let userSigner: HardhatEthersSigner;

    let tokenAmount: bigint;

    const { erc20 } = moduleConfig.contracts;
    const chain = moduleConfig.chain;
    const { owner } = moduleConfig.contracts.erc20;

    // Notice: user is acting as a faucet, providing the owner with enough tokens
    // to cover transaction fees and execute mint, burn, and transferOwnership tests.
    beforeEach(async () => {
        abi = erc20.abi;
        contractInterface = new Interface(erc20.abi);
        contractAddress = erc20.contractAddress;
        [ownerSigner, userSigner] = await ethers.getSigners();

        ownerContract = new ethers.Contract(contractAddress, abi, ownerSigner);
        userContract = new ethers.Contract(contractAddress, abi, userSigner);

        await executeTx(userContract.transfer(ownerSigner.address, erc20.feeFund));

        tokenAmount = toBigInt(erc20.amount);
    });

    // Notice: This acts as a blockchain state reset by burning all tokens from the owner.
    // Ensures that each test starts with a clean slate for the owner.
    afterEach(async () => {
        await resetOwnerState(ownerContract, userContract, ownerSigner, userSigner);
    });

    describe("get functions", () => {
        it("should return the correct owner", async () => {
            const currentOwner = await ownerContract.owner();
            expect(currentOwner).to.equal(ownerSigner.address);
        });

        it("should return the correct total supply", async () => {
            const totalSupply = await ownerContract.totalSupply();
            expect(totalSupply).to.equal(1000000000000000000000000002n);
        });

        it("should check that allowance is 0 ", async () => {
            await executeTx(ownerContract.approve(userSigner.address, 0n));
            const allowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(allowance).to.equal(0n);
        });

        it("should get owner's balance", async () => {
            const ownerBalance = await userContract.balanceOf(ownerSigner.address);
            expect(ownerBalance).to.equal(erc20.feeFund);
        });

        it("should return the correct name, symbol, and decimals", async () => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], chain as unknown as Chain);
            const tokenName = await ownerContract.name();
            const tokenSymbol = await ownerContract.symbol();
            const tokenDecimals = await ownerContract.decimals();

            expect(tokenName).to.equal("");
            expect(tokenSymbol).to.equal("");
            expect(tokenDecimals).to.equal(18);
        });
    });

    describe("mint coins", () => {
        before(function () {
            assertChainEnvironments(["localnet"], chain as unknown as Chain);
        });
        it("should mint tokens to the user", async () => {
            const beforeBalance = await ownerContract.balanceOf(userSigner.address);

            const { receipt: mintReceipt } = await executeTx(ownerContract.mint(userSigner.address, tokenAmount));

            expectTransferEvent(mintReceipt, ethers.ZeroAddress, userSigner.address, tokenAmount, contractInterface);

            const afterBalance = await ownerContract.balanceOf(userSigner.address);
            expect(afterBalance).to.equal(beforeBalance + tokenAmount);
        });

        it("should prevent non-owner from minting tokens", async () => {
            await expectRevert(userContract.mint(userSigner.address, tokenAmount), ERC20Errors.MINTER_IS_NOT_OWNER);
        });

        it("should revert when attempting to mint 0 tokens", async () => {
            await expectRevert(ownerContract.mint(ownerSigner.address, 0n), ERC20Errors.INVALID_COINS);
        });
    });

    describe("burn coins", () => {
        before(function () {
            assertChainEnvironments(["localnet"], chain as unknown as Chain);
        });
        it("should burn specified amount", async () => {
            const beforeBalance = await ownerContract.balanceOf(ownerSigner.address);

            const { gasCost: mintGasFee } = await executeTx(ownerContract.mint(ownerSigner.address, tokenAmount));

            const { gasCost: burnGasFee } = await executeTx(ownerContract.burn(tokenAmount));

            const afterBalance = await ownerContract.balanceOf(ownerSigner.address);
            const expectedFinalBalance = beforeBalance - mintGasFee - burnGasFee;
            expect(afterBalance).to.equal(expectedFinalBalance);
        });

        it("should revert if trying to burn more than balance", async () => {
            const beforeBalance = await ownerContract.balanceOf(ownerSigner.address);
            await expectRevert(ownerContract.burn(tokenAmount + beforeBalance), ERC20Errors.TRANSFER_AMOUNT_EXCEEDS_BALANCE);
        });
        it("should revert when attempting to burn 0 tokens", async () => {
            await expectRevert(ownerContract.burn(0n), ERC20Errors.INVALID_COINS);
        });
    });

    describe("burn (owner-only burn)", () => {
        before(function () {
            assertChainEnvironments(["localnet"], chain as unknown as Chain);
        });
        it("should revert if sender is not owner", async () => {
            await expectRevert(userContract["burn(address,uint256)"](ownerSigner.address, tokenAmount), ERC20Errors.SENDER_IS_NOT_OWNER);
        });

        it("should burn coins of spender if sender is owner", async () => {
            await executeTx(ownerContract.mint(userSigner.address, tokenAmount));
            const beforeBalance = await ownerContract.balanceOf(userSigner.address);

            await executeTx(ownerContract["burn(address,uint256)"](userSigner.address, tokenAmount));

            const afterBalance = await ownerContract.balanceOf(userSigner.address);
            expect(afterBalance).to.equal(beforeBalance - tokenAmount);
        });
    });

    describe("burnFrom", () => {
        before(function () {
            assertChainEnvironments(["localnet"], chain as unknown as Chain);
        });
        it("should revert if spender does not have allowance", async () => {
            await executeTx(ownerContract.mint(userSigner.address, tokenAmount));

            await expectRevert(ownerContract.burnFrom(userSigner.address, tokenAmount), ERC20Errors.INSUFFICIENT_ALLOWANCE);
        });

        it("should burn coins if spender has allowance", async () => {
            await executeTx(ownerContract.approve(userSigner.address, tokenAmount));

            const initialAllowance = await userContract.allowance(ownerSigner.address, userSigner.address);
            expect(initialAllowance).to.equal(tokenAmount);

            const beforeBalance = await userContract.balanceOf(ownerSigner.address);

            await executeTx(userContract.burnFrom(ownerSigner.address, tokenAmount));

            const afterBalance = await userContract.balanceOf(ownerSigner.address);
            expect(afterBalance).to.equal(beforeBalance - tokenAmount);

            const finalAllowance = await userContract.allowance(ownerSigner.address, userSigner.address);
            expect(finalAllowance).to.equal(0n);
        });
    });

    describe("transferOwnership", () => {
        before(function () {
            assertChainEnvironments(["localnet"], chain as unknown as Chain);
        });
        it("should revert if sender is not the owner", async () => {
            await expectRevert(userContract.transferOwnership(ownerSigner.address), ERC20Errors.SENDER_IS_NOT_OWNER);
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

            await executeTx(ownerContract.increaseAllowance(userSigner.address, tokenAmount));

            const newAllowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(newAllowance).to.equal(initialAllowance + tokenAmount);
        });
    });

    describe("transfer", () => {
        it("should successfully transfer tokens between accounts", async () => {
            const senderBeforeBalance = await ownerContract.balanceOf(ownerSigner.address);
            const recipientBeforeBalance = await ownerContract.balanceOf(userSigner.address);

            const { gasCost: transferGasFee } = await executeTx(ownerContract.transfer(userSigner.address, tokenAmount));

            const senderAfterBalance = await ownerContract.balanceOf(ownerSigner.address);
            const recipientAfterBalance = await ownerContract.balanceOf(userSigner.address);

            expect(senderBeforeBalance - tokenAmount - transferGasFee).to.equal(senderAfterBalance);
            expect(recipientBeforeBalance + tokenAmount).to.equal(recipientAfterBalance);
        });

        it("should revert if sender has insufficient balance", async () => {
            await expectRevert(
                ownerContract.transfer(userSigner.address, 10000000000000000000n),
                ERC20Errors.TRANSFER_AMOUNT_EXCEEDS_BALANCE,
            );
        });

        it("should revert when attempting to transfer 0 tokens", async () => {
            await expectRevert(ownerContract.transfer(userSigner.address, 0n), ERC20Errors.ZERO_TOKEN_AMOUNT_NOT_POSITIVE);
        });
    });

    describe("transferFrom", () => {
        it("should successfully transfer tokens using transferFrom", async () => {
            await executeTx(ownerContract.approve(userSigner.address, tokenAmount));
            const ownerBeforeBalance = await ownerContract.balanceOf(ownerSigner.address);
            const recipientBeforeBalance = await ownerContract.balanceOf(userSigner.address);

            const { gasCost: transferFromGasFee } = await executeTx(
                userContract.transferFrom(ownerSigner.address, userSigner.address, tokenAmount),
            );

            const ownerAfterBalance = await ownerContract.balanceOf(ownerSigner.address);
            const recipientAfterBalance = await ownerContract.balanceOf(userSigner.address);

            expect(ownerBeforeBalance - tokenAmount).to.equal(ownerAfterBalance);
            expect(recipientBeforeBalance + tokenAmount - transferFromGasFee).to.equal(recipientAfterBalance);
        });

        it("should revert if allowance is insufficient", async () => {
            // Approve an amount smaller than tokenAmount.
            const approvedAmount = tokenAmount - 1n;
            await executeTx(ownerContract.approve(userSigner.address, approvedAmount));
            await expectRevert(
                userContract.transferFrom(ownerSigner.address, userSigner.address, tokenAmount),
                ERC20Errors.INSUFFICIENT_ALLOWANCE,
            );
        });

        it("should revert when attempting to transfer 0 tokens", async () => {
            await executeTx(ownerContract.approve(userSigner.address, tokenAmount));
            await expectRevert(
                userContract.transferFrom(ownerSigner.address, userSigner.address, 0n),
                ERC20Errors.ZERO_TOKEN_AMOUNT_NOT_POSITIVE,
            );
        });
    });

    // TODO failing test, seems like Approval 1st param (owner) is set to address(this) instead of msg.sender.
    describe("approve", () => {
        it("should set and reset the allowance correctly and emit Approval events", async () => {
            assertChainEnvironments(["localnet"], chain as unknown as Chain);

            const approveTx = await ownerContract.approve(userSigner.address, tokenAmount);
            const approveReceipt = await approveTx.wait();

            let allowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(allowance).to.equal(tokenAmount);

            const approvalEvent = getEventArgs(approveReceipt, contractInterface, "Approval");

            expect(approvalEvent).to.not.eq(undefined);
            expect(approvalEvent!.args.owner).to.equal(erc20.contractAddress);
            expect(approvalEvent!.args.spender).to.equal(userSigner.address);
            expect(approvalEvent!.args.value.toString()).to.equal(tokenAmount.toString());

            const resetApproveTx = await ownerContract.approve(userSigner.address, 0n);
            const resetApproveReceipt = await resetApproveTx.wait();

            allowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(allowance).to.equal(0n);

            const resetApprovalEvent = getEventArgs(resetApproveReceipt, contractInterface, "Approval");

            expect(resetApprovalEvent).to.not.eq(undefined);
            expect(resetApprovalEvent!.args.owner).to.equal(erc20.contractAddress);
            expect(resetApprovalEvent!.args.spender).to.equal(userSigner.address);
            expect(resetApprovalEvent!.args.value.toString()).to.equal("0");
        });

        it("should set and reset the allowance correctly and emit Approval events", async () => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], chain as unknown as Chain);

            const approveTx = await ownerContract.approve(userSigner.address, tokenAmount);
            const approveReceipt = await approveTx.wait();

            let allowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(allowance).to.equal(tokenAmount);

            const approvalEvent = getEventArgs(approveReceipt, contractInterface, "Approval");

            expect(approvalEvent).to.not.eq(undefined);
            expect(approvalEvent!.args.owner).to.equal(erc20.contractAddress);
            expect(approvalEvent!.args.spender).to.equal(userSigner.address);
            expect(approvalEvent!.args.value.toString()).to.equal(tokenAmount.toString());

            const resetApproveTx = await ownerContract.approve(userSigner.address, 0n);
            const resetApproveReceipt = await resetApproveTx.wait();

            allowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(allowance).to.equal(0n);

            const resetApprovalEvent = getEventArgs(resetApproveReceipt, contractInterface, "Approval");

            expect(resetApprovalEvent).to.not.eq(undefined);
            expect(resetApprovalEvent!.args.owner).to.equal(owner);
            expect(resetApprovalEvent!.args.spender).to.equal(userSigner.address);
            expect(resetApprovalEvent!.args.value.toString()).to.equal("0");
        });
    });
});
