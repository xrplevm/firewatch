import { expect } from "chai";
import { ethers } from "hardhat";
import { resetOwnerState, expectTransferEvent } from "./utils/helpers";
import { Interface, toBigInt, Contract } from "ethers";
import { ERC20Errors } from "../../../src/precompiles/erc20/errors/errors";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expectRevert, executeTx } from "@testing/hardhat/utils";
import moduleConfig from "../../../module.config.json";
import { getEventArgs } from "@shared/evm/utils";
import { isChainEnvironment } from "@testing/mocha/assertions";
import { Chain } from "@firewatch/core/chain";
import { describeOrSkip } from "@testing/mocha/utils";

/**
 * This test is a basic test for the ERC20 precompile.
 * Some context on ERC20:
 * Some contract properties:
 * - totalSupply() — returns the total number of tokens in existence
 * - decimals() — returns the number of decimal places the token uses
 * - name() — returns the name of the token
 * - symbol() — returns the symbol of the token
 * Allowance is a mechanism that lets a token owner authorize a third party (spender) to transfer tokens on their behalf, up to a specified amount.
 * - approve(spender, amount) — the owner grants spender permission to move up to amount tokens
 * - allowance(owner, spender) — returns how many tokens spender is still allowed to move from owner (default is 0)
 * - transferFrom(owner, to, amount) — the spender exercises the allowance, moving tokens from owner to to
 * Token exchange functionalities:
 * - transfer(to, amount) — the owner transfers tokens to another account
 * Token query functionalities:
 * - balanceOf(account) — returns the balance of an account
 * Token creation/destruction functionalities:
 * - mint(account, amount) — the owner mints tokens to an account
 * - burn(amount) — the owner burns tokens
 * - burnFrom(account, amount) — the spender burns tokens on behalf of the owner
 */

describe("ERC20", () => {
    let abi: string[];
    let contractInterface: Interface;
    let contractAddress: string;
    let contractAsOwner: Contract;
    let contractAsUser: Contract;

    let ownerSigner: HardhatEthersSigner;
    let userSigner: HardhatEthersSigner;

    let tokenAmount: bigint;
    let burnAmount: bigint;

    const { erc20 } = moduleConfig.contracts;
    const chain = moduleConfig.chain;

    // Notice: user is acting as a faucet, providing the owner with enough tokens
    // to cover transaction fees and execute mint and burn tests.
    before(async () => {
        abi = erc20.abi;
        contractInterface = new Interface(erc20.abi);
        contractAddress = erc20.contractAddress;
        [ownerSigner, userSigner] = await ethers.getSigners();

        contractAsOwner = new ethers.Contract(contractAddress, abi, ownerSigner);
        contractAsUser = new ethers.Contract(contractAddress, abi, userSigner);

        tokenAmount = toBigInt(erc20.amount);
        burnAmount = toBigInt(erc20.burnAmount);
    });

    describe("totalSupply", () => {
        it("should return a positive totalSupply", async () => {
            const totalSupply = await contractAsOwner.totalSupply();
            expect(totalSupply).to.be.gt(0);
        });
    });

    describe("allowance", () => {
        it("should check that allowance is 0 after approve 0", async () => {
            await executeTx(contractAsUser.approve(ownerSigner.address, 0n));
            const allowance = await contractAsUser.allowance(userSigner.address, ownerSigner.address);
            expect(allowance).to.equal(0n);
        });
    });

    describe("name", () => {
        it("should return the correct name", async () => {
            const tokenName = await contractAsOwner.name();
            expect(tokenName).to.equal("XRP");
        });
    });

    describe("symbol", () => {
        it("should return the correct symbol", async () => {
            const tokenSymbol = await contractAsOwner.symbol();
            expect(tokenSymbol).to.equal("XRP");
        });
    });

    describe("decimals", () => {
        it("should return the correct decimals", async () => {
            const tokenDecimals = await contractAsOwner.decimals();
            expect(tokenDecimals).to.equal(18);
        });
    });

    describeOrSkip("mint coins", isChainEnvironment(["localnet"], chain as unknown as Chain), () => {
        beforeEach(async () => {
            await executeTx(contractAsUser.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(contractAsOwner, contractAsUser, ownerSigner, userSigner);
        });

        it("should mint tokens to the user", async () => {
            const beforeBalance = await contractAsOwner.balanceOf(userSigner.address);

            const { receipt: mintReceipt } = await executeTx(contractAsOwner.mint(userSigner.address, tokenAmount));

            expectTransferEvent(mintReceipt, ethers.ZeroAddress, userSigner.address, tokenAmount, contractInterface);

            const afterBalance = await contractAsOwner.balanceOf(userSigner.address);
            expect(afterBalance).to.equal(beforeBalance + tokenAmount);
        });

        it("should prevent non-owner from minting tokens", async () => {
            await expectRevert(contractAsUser.mint(userSigner.address, tokenAmount), ERC20Errors.MINTER_IS_NOT_OWNER);
        });

        it("should revert when attempting to mint 0 tokens", async () => {
            await expectRevert(contractAsOwner.mint(ownerSigner.address, 0n), ERC20Errors.INVALID_COINS);
        });
    });

    describeOrSkip("burn coins", isChainEnvironment(["localnet", "devnet", "testnet"], chain as unknown as Chain), () => {
        it("should burn specified amount", async () => {
            const beforeBalance = await contractAsUser.balanceOf(userSigner.address);

            const { gasCost: burnGasFee } = await executeTx(contractAsUser.burn(burnAmount));

            const afterBalance = await contractAsUser.balanceOf(userSigner.address);
            const expectedFinalBalance = beforeBalance - burnAmount - burnGasFee;
            expect(afterBalance).to.equal(expectedFinalBalance);
        });

        it("should revert if trying to burn more than balance", async () => {
            const beforeBalance = await contractAsUser.balanceOf(ownerSigner.address);
            await expectRevert(contractAsUser.burn(tokenAmount + beforeBalance), ERC20Errors.TRANSFER_AMOUNT_EXCEEDS_BALANCE);
        });
        it("should revert when attempting to burn 0 tokens", async () => {
            await expectRevert(contractAsUser.burn(0n), ERC20Errors.INVALID_COINS);
        });
    });

    describeOrSkip("burn (owner-only burn)", isChainEnvironment(["localnet"], chain as unknown as Chain), () => {
        beforeEach(async () => {
            await executeTx(contractAsUser.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(contractAsOwner, contractAsUser, ownerSigner, userSigner);
        });

        it("should revert if sender is not owner", async () => {
            await expectRevert(contractAsUser["burn(address,uint256)"](ownerSigner.address, tokenAmount), ERC20Errors.SENDER_IS_NOT_OWNER);
        });

        it("should burn coins of spender if sender is owner", async () => {
            const beforeBalance = await contractAsOwner.balanceOf(userSigner.address);

            await executeTx(contractAsOwner["burn(address,uint256)"](userSigner.address, tokenAmount));

            const afterBalance = await contractAsOwner.balanceOf(userSigner.address);
            expect(afterBalance).to.equal(beforeBalance - tokenAmount);
        });
    });

    describeOrSkip("burnFrom", isChainEnvironment(["localnet", "devnet", "testnet"], chain as unknown as Chain), () => {
        beforeEach(async () => {
            await executeTx(contractAsUser.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(contractAsOwner, contractAsUser, ownerSigner, userSigner);
        });

        it("should revert if spender does not have allowance", async () => {
            await expectRevert(contractAsOwner.burnFrom(userSigner.address, tokenAmount), ERC20Errors.INSUFFICIENT_ALLOWANCE);
        });

        it("should burn coins if spender has allowance", async () => {
            await executeTx(contractAsOwner.approve(userSigner.address, tokenAmount));

            const initialAllowance = await contractAsUser.allowance(ownerSigner.address, userSigner.address);
            expect(initialAllowance).to.equal(tokenAmount);

            const beforeBalance = await contractAsUser.balanceOf(ownerSigner.address);

            await executeTx(contractAsUser.burnFrom(ownerSigner.address, tokenAmount));

            const afterBalance = await contractAsUser.balanceOf(ownerSigner.address);
            expect(afterBalance).to.equal(beforeBalance - tokenAmount);

            const finalAllowance = await contractAsUser.allowance(ownerSigner.address, userSigner.address);
            expect(finalAllowance).to.equal(0n);
        });
    });

    describe("transfer", () => {
        beforeEach(async () => {
            await executeTx(contractAsUser.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(contractAsOwner, contractAsUser, ownerSigner, userSigner);
        });

        it("should successfully transfer tokens between accounts", async () => {
            const senderBeforeBalance = await contractAsOwner.balanceOf(ownerSigner.address);
            const recipientBeforeBalance = await contractAsOwner.balanceOf(userSigner.address);

            const { gasCost: transferGasFee } = await executeTx(contractAsOwner.transfer(userSigner.address, tokenAmount));

            const senderAfterBalance = await contractAsOwner.balanceOf(ownerSigner.address);
            const recipientAfterBalance = await contractAsOwner.balanceOf(userSigner.address);

            expect(senderBeforeBalance - tokenAmount - transferGasFee).to.equal(senderAfterBalance);
            expect(recipientBeforeBalance + tokenAmount).to.equal(recipientAfterBalance);
        });

        it("should revert if sender has insufficient balance", async () => {
            await expectRevert(
                contractAsOwner.transfer(userSigner.address, 10000000000000000000000n),
                ERC20Errors.TRANSFER_AMOUNT_EXCEEDS_BALANCE,
            );
        });

        it("should revert when attempting to transfer 0 tokens", async () => {
            await expectRevert(contractAsOwner.transfer(userSigner.address, 0n), ERC20Errors.ZERO_TOKEN_AMOUNT_NOT_POSITIVE);
        });
    });

    describe("transferFrom", () => {
        beforeEach(async () => {
            await executeTx(contractAsUser.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(contractAsOwner, contractAsUser, ownerSigner, userSigner);
        });

        it("should successfully transfer tokens using transferFrom", async () => {
            await executeTx(contractAsOwner.approve(userSigner.address, tokenAmount));
            const ownerBeforeBalance = await contractAsOwner.balanceOf(ownerSigner.address);
            const recipientBeforeBalance = await contractAsOwner.balanceOf(userSigner.address);

            const { gasCost: transferFromGasFee } = await executeTx(
                contractAsUser.transferFrom(ownerSigner.address, userSigner.address, tokenAmount),
            );

            const ownerAfterBalance = await contractAsOwner.balanceOf(ownerSigner.address);
            const recipientAfterBalance = await contractAsOwner.balanceOf(userSigner.address);

            expect(ownerBeforeBalance - tokenAmount).to.equal(ownerAfterBalance);
            expect(recipientBeforeBalance + tokenAmount - transferFromGasFee).to.equal(recipientAfterBalance);
        });

        it("should revert if allowance is insufficient", async () => {
            // Approve an amount smaller than tokenAmount.
            const approvedAmount = tokenAmount - 1n;
            await executeTx(contractAsOwner.approve(userSigner.address, approvedAmount));
            await expectRevert(
                contractAsUser.transferFrom(ownerSigner.address, userSigner.address, tokenAmount),
                ERC20Errors.INSUFFICIENT_ALLOWANCE,
            );
        });

        it("should revert when attempting to transfer 0 tokens", async () => {
            await executeTx(contractAsOwner.approve(userSigner.address, tokenAmount));
            await expectRevert(
                contractAsUser.transferFrom(ownerSigner.address, userSigner.address, 0n),
                ERC20Errors.ZERO_TOKEN_AMOUNT_NOT_POSITIVE,
            );
        });
    });

    // TODO failing test, seems like Approval 1st param (owner) is set to address(this) instead of msg.sender.
    describe("approve", () => {
        beforeEach(async () => {
            await executeTx(contractAsUser.transfer(ownerSigner.address, erc20.faucetFund));
        });
        afterEach(async () => {
            await resetOwnerState(contractAsOwner, contractAsUser, ownerSigner, userSigner);
        });

        it("should set and reset the allowance correctly and emit Approval events", async () => {
            const approveTx = await contractAsOwner.approve(userSigner.address, tokenAmount);
            const approveReceipt = await approveTx.wait();

            let allowance = await contractAsOwner.allowance(ownerSigner.address, userSigner.address);
            expect(allowance).to.equal(tokenAmount);

            const approvalEvent = getEventArgs(approveReceipt, contractInterface, "Approval");

            expect(approvalEvent).to.not.eq(undefined);
            expect(approvalEvent!.args.owner).to.equal(ownerSigner.address);
            expect(approvalEvent!.args.spender).to.equal(userSigner.address);
            expect(approvalEvent!.args.value.toString()).to.equal(tokenAmount.toString());

            const resetApproveTx = await contractAsOwner.approve(userSigner.address, 0n);
            const resetApproveReceipt = await resetApproveTx.wait();

            allowance = await contractAsOwner.allowance(ownerSigner.address, userSigner.address);
            expect(allowance).to.equal(0n);

            const resetApprovalEvent = getEventArgs(resetApproveReceipt, contractInterface, "Approval");

            expect(resetApprovalEvent).to.not.eq(undefined);
            expect(resetApprovalEvent!.args.owner).to.equal(ownerSigner.address);
            expect(resetApprovalEvent!.args.spender).to.equal(userSigner.address);
            expect(resetApprovalEvent!.args.value.toString()).to.equal("0");
        });
    });
});
