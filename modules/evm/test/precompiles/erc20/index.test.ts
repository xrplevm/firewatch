import { expect } from "chai";
import { ethers } from "hardhat";
import { resetOwnerState, expectTransferEvent } from "./utils/helpers";
import { Interface, toBigInt, Contract } from "ethers";
import { ERC20Errors } from "../../../src/precompiles/erc20/errors/errors";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expectRevert, executeTx } from "@testing/hardhat/utils";
import moduleConfig from "../../../module.config.example.json";
import { getEventArgs } from "@shared/evm/utils";
import { assertChainEnvironments } from "@testing/mocha/assertions";
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

    let tokenMinimumAmount: bigint;

    const { erc20 } = moduleConfig.contracts;
    const chain = moduleConfig.chain;
    const { owner } = moduleConfig.contracts.erc20;

    // Notice: user is acting as a faucet, providing the owner with enough tokens
    // to cover transaction fees and execute mint, burn, and transferOwnership (just in localnet) tests.
    before(async () => {
        abi = erc20.abi;
        contractInterface = new Interface(erc20.abi);
        contractAddress = erc20.contractAddress;
        [ownerSigner, userSigner] = await ethers.getSigners();

        ownerContract = new ethers.Contract(contractAddress, abi, ownerSigner);
        userContract = new ethers.Contract(contractAddress, abi, userSigner);

        tokenMinimumAmount = toBigInt(erc20.minimumAmount);
    });

    describe("owner", () => {
        it("should return the correct owner", async () => {
            const currentOwner = await ownerContract.owner();
            expect(currentOwner).to.equal(owner);
        });
    });

    describe("totalSupply", () => {
        it("should correctly update totalSupply after burn", async () => {
            const totalSupplyBefore = await userContract.totalSupply();
            await executeTx(userContract.burn(tokenMinimumAmount));
            const totalSupplyAfter = await userContract.totalSupply();

            expect(totalSupplyAfter).to.equal(totalSupplyBefore - tokenMinimumAmount);
        });
    });

    describe("allowance", () => {
        it("should check that allowance is 0", async () => {
            await executeTx(userContract.approve(ownerSigner.address, 0n));
            const allowance = await userContract.allowance(ownerSigner.address, userSigner.address);
            expect(allowance).to.equal(0n);
        });
    });

    describe("name", () => {
        it("should return the correct name", async () => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], chain as unknown as Chain);
            const tokenName = await ownerContract.name();
            expect(tokenName).to.equal("XRP");
        });
    });

    describe("symbol", () => {
        it("should return the correct symbol", async () => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], chain as unknown as Chain);
            const tokenSymbol = await ownerContract.symbol();
            expect(tokenSymbol).to.equal("XRP");
        });
    });

    describe("decimals", () => {
        it("should return the correct decimals", async () => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], chain as unknown as Chain);
            const tokenDecimals = await ownerContract.decimals();
            expect(tokenDecimals).to.equal(18);
        });
    });

    describe("mint coins", () => {
        before(() => {
            assertChainEnvironments(["localnet"], chain as unknown as Chain);
        });
        beforeEach(async () => {
            await executeTx(userContract.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(ownerContract, userContract, ownerSigner, userSigner, chain.env, erc20.gasPrice);
        });

        it("should mint tokens to the user", async () => {
            const beforeBalance = await ownerContract.balanceOf(userSigner.address);

            const { receipt: mintReceipt } = await executeTx(ownerContract.mint(userSigner.address, tokenMinimumAmount));

            expectTransferEvent(mintReceipt, ethers.ZeroAddress, userSigner.address, tokenMinimumAmount, contractInterface);

            const afterBalance = await ownerContract.balanceOf(userSigner.address);
            expect(afterBalance).to.equal(beforeBalance + tokenMinimumAmount);
        });

        it("should prevent non-owner from minting tokens", async () => {
            await expectRevert(userContract.mint(userSigner.address, tokenMinimumAmount), ERC20Errors.MINTER_IS_NOT_OWNER);
        });

        it("should revert when attempting to mint 0 tokens", async () => {
            await expectRevert(ownerContract.mint(ownerSigner.address, 0n), ERC20Errors.INVALID_COINS);
        });
    });

    describe("burn coins", () => {
        before(() => {
            assertChainEnvironments(["localnet", "devnet", "testnet"], chain as unknown as Chain);
        });
        it("should burn specified amount", async () => {
            const beforeBalance = await userContract.balanceOf(userSigner.address);

            const { gasCost: burnGasFee } = await executeTx(userContract.burn(tokenMinimumAmount));

            const afterBalance = await userContract.balanceOf(userSigner.address);
            const expectedFinalBalance = beforeBalance - tokenMinimumAmount - burnGasFee;
            expect(afterBalance).to.equal(expectedFinalBalance);
        });

        it("should revert if trying to burn more than balance", async () => {
            const beforeBalance = await userContract.balanceOf(ownerSigner.address);
            await expectRevert(userContract.burn(tokenMinimumAmount + beforeBalance), ERC20Errors.TRANSFER_AMOUNT_EXCEEDS_BALANCE);
        });
        it("should revert when attempting to burn 0 tokens", async () => {
            await expectRevert(userContract.burn(0n), ERC20Errors.INVALID_COINS);
        });
    });

    describe("burn (owner-only burn)", () => {
        before(() => {
            assertChainEnvironments(["localnet"], chain as unknown as Chain);
        });
        beforeEach(async () => {
            await executeTx(userContract.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(ownerContract, userContract, ownerSigner, userSigner, chain.env, erc20.gasPrice);
        });

        it("should revert if sender is not owner", async () => {
            await expectRevert(
                userContract["burn(address,uint256)"](ownerSigner.address, tokenMinimumAmount),
                ERC20Errors.SENDER_IS_NOT_OWNER,
            );
        });

        it("should burn coins of spender if sender is owner", async () => {
            const beforeBalance = await ownerContract.balanceOf(userSigner.address);

            await executeTx(ownerContract["burn(address,uint256)"](userSigner.address, tokenMinimumAmount));

            const afterBalance = await ownerContract.balanceOf(userSigner.address);
            expect(afterBalance).to.equal(beforeBalance - tokenMinimumAmount);
        });
    });

    describe("burnFrom", () => {
        before(() => {
            assertChainEnvironments(["localnet", "devnet", "testnet"], chain as unknown as Chain);
        });
        beforeEach(async () => {
            await executeTx(userContract.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(ownerContract, userContract, ownerSigner, userSigner, chain.env, erc20.gasPrice);
        });

        it("should revert if spender does not have allowance", async () => {
            await expectRevert(ownerContract.burnFrom(userSigner.address, tokenMinimumAmount), ERC20Errors.INSUFFICIENT_ALLOWANCE);
        });

        it("should burn coins if spender has allowance", async () => {
            await executeTx(ownerContract.approve(userSigner.address, tokenMinimumAmount));

            const initialAllowance = await userContract.allowance(ownerSigner.address, userSigner.address);
            expect(initialAllowance).to.equal(tokenMinimumAmount);

            const beforeBalance = await userContract.balanceOf(ownerSigner.address);

            await executeTx(userContract.burnFrom(ownerSigner.address, tokenMinimumAmount));

            const afterBalance = await userContract.balanceOf(ownerSigner.address);
            expect(afterBalance).to.equal(beforeBalance - tokenMinimumAmount);

            const finalAllowance = await userContract.allowance(ownerSigner.address, userSigner.address);
            expect(finalAllowance).to.equal(0n);
        });
    });

    describe("transferOwnership", () => {
        before(function () {
            assertChainEnvironments(["localnet"], chain as unknown as Chain);
        });
        beforeEach(async () => {
            await executeTx(userContract.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(ownerContract, userContract, ownerSigner, userSigner, chain.env, erc20.gasPrice);
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
        beforeEach(async () => {
            await executeTx(userContract.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(ownerContract, userContract, ownerSigner, userSigner, chain.env, erc20.gasPrice);
        });

        it("should correctly increase allowance", async () => {
            const initialAllowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(initialAllowance).to.equal(0);

            await executeTx(ownerContract.increaseAllowance(userSigner.address, tokenMinimumAmount));

            const newAllowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(newAllowance).to.equal(initialAllowance + tokenMinimumAmount);
        });
    });

    describe("transfer", () => {
        beforeEach(async () => {
            await executeTx(userContract.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(ownerContract, userContract, ownerSigner, userSigner, chain.env, erc20.gasPrice);
        });

        it("should successfully transfer tokens between accounts", async () => {
            const senderBeforeBalance = await ownerContract.balanceOf(ownerSigner.address);
            const recipientBeforeBalance = await ownerContract.balanceOf(userSigner.address);

            const { gasCost: transferGasFee } = await executeTx(ownerContract.transfer(userSigner.address, tokenMinimumAmount));

            const senderAfterBalance = await ownerContract.balanceOf(ownerSigner.address);
            const recipientAfterBalance = await ownerContract.balanceOf(userSigner.address);

            expect(senderBeforeBalance - tokenMinimumAmount - transferGasFee).to.equal(senderAfterBalance);
            expect(recipientBeforeBalance + tokenMinimumAmount).to.equal(recipientAfterBalance);
        });

        it("should revert if sender has insufficient balance", async () => {
            await expectRevert(
                ownerContract.transfer(userSigner.address, 10000000000000000000000n),
                ERC20Errors.TRANSFER_AMOUNT_EXCEEDS_BALANCE,
            );
        });

        it("should revert when attempting to transfer 0 tokens", async () => {
            await expectRevert(ownerContract.transfer(userSigner.address, 0n), ERC20Errors.ZERO_TOKEN_AMOUNT_NOT_POSITIVE);
        });
    });

    describe("transferFrom", () => {
        beforeEach(async () => {
            await executeTx(userContract.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(ownerContract, userContract, ownerSigner, userSigner, chain.env, erc20.gasPrice);
        });

        it("should successfully transfer tokens using transferFrom", async () => {
            await executeTx(ownerContract.approve(userSigner.address, tokenMinimumAmount));
            const ownerBeforeBalance = await ownerContract.balanceOf(ownerSigner.address);
            const recipientBeforeBalance = await ownerContract.balanceOf(userSigner.address);

            const { gasCost: transferFromGasFee } = await executeTx(
                userContract.transferFrom(ownerSigner.address, userSigner.address, tokenMinimumAmount),
            );

            const ownerAfterBalance = await ownerContract.balanceOf(ownerSigner.address);
            const recipientAfterBalance = await ownerContract.balanceOf(userSigner.address);

            expect(ownerBeforeBalance - tokenMinimumAmount).to.equal(ownerAfterBalance);
            expect(recipientBeforeBalance + tokenMinimumAmount - transferFromGasFee).to.equal(recipientAfterBalance);
        });

        it("should revert if allowance is insufficient", async () => {
            // Approve an amount smaller than tokenMinimumAmount.
            const approvedAmount = tokenMinimumAmount - 1n;
            await executeTx(ownerContract.approve(userSigner.address, approvedAmount));
            await expectRevert(
                userContract.transferFrom(ownerSigner.address, userSigner.address, tokenMinimumAmount),
                ERC20Errors.INSUFFICIENT_ALLOWANCE,
            );
        });

        it("should revert when attempting to transfer 0 tokens", async () => {
            await executeTx(ownerContract.approve(userSigner.address, tokenMinimumAmount));
            await expectRevert(
                userContract.transferFrom(ownerSigner.address, userSigner.address, 0n),
                ERC20Errors.ZERO_TOKEN_AMOUNT_NOT_POSITIVE,
            );
        });
    });

    // TODO failing test, seems like Approval 1st param (owner) is set to address(this) instead of msg.sender.
    describe("approve", () => {
        beforeEach(async () => {
            await executeTx(userContract.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(ownerContract, userContract, ownerSigner, userSigner, chain.env, erc20.gasPrice);
        });

        it("should set and reset the allowance correctly and emit Approval events", async () => {
            const approveTx = await ownerContract.approve(userSigner.address, tokenMinimumAmount);
            const approveReceipt = await approveTx.wait();

            let allowance = await ownerContract.allowance(ownerSigner.address, userSigner.address);
            expect(allowance).to.equal(tokenMinimumAmount);

            const approvalEvent = getEventArgs(approveReceipt, contractInterface, "Approval");

            expect(approvalEvent).to.not.eq(undefined);
            expect(approvalEvent!.args.owner).to.equal(erc20.contractAddress);
            expect(approvalEvent!.args.spender).to.equal(userSigner.address);
            expect(approvalEvent!.args.value.toString()).to.equal(tokenMinimumAmount.toString());

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
    });
});
