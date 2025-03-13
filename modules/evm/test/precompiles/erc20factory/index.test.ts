import { expect } from "chai";
import { ethers } from "hardhat";
import { Interface, Contract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { executeTx, expectRevert } from "@testing/hardhat/utils";
import moduleConfig from "../../../module.config.example.json";
import { ERC20FactoryErrors } from "../../../src/precompiles/erc20factory/errors/errors";

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

describe("ERC20Factory", () => {
    let abi: string[];
    let contractInterface: Interface;
    let precompileAddress: string;
    let factory: Contract;

    let signer: HardhatEthersSigner;

    const { erc20, erc20factory } = moduleConfig;

    // Notice: user is acting as a faucet, providing the owner with enough tokens
    // to cover transaction fees and execute mint, burn, and transferOwnership tests.
    beforeEach(async () => {
        abi = erc20factory.abi;
        contractInterface = new Interface(erc20factory.abi);
        precompileAddress = erc20factory.precompileAddress;
        [, signer] = await ethers.getSigners();
        factory = new ethers.Contract(precompileAddress, abi, signer);
    });

    describe("calculate address", () => {
        it("should calculate address correctly", async () => {
            const address = await factory.calculateAddress(0, "0x0000000000000000000000000000000000000000000000000000000000000000");
            expect(address).to.equal("0x7c9956CD07696760556Cb8a19EF4c304BD8DDEFF");
        });
    });

    describe("create", () => {
        it("should create a token pair", async () => {
            const salt = "0x0000000000000000000000000000000000000000000000000000000000000010";
            const address = await factory.calculateAddress(0, salt);

            await executeTx(factory.create(0, salt, "aaa", "AAA", 6));

            const token = new ethers.Contract(address, erc20.abi, signer);
            expect(await token.name()).to.equal(`erc20/${address}`);
            expect(await token.symbol()).to.equal("AAA");
            expect(await token.decimals()).to.equal(6);
            expect(await token.totalSupply()).to.equal(0);
        });

        it("should throw invalid name", async () => {
            const salt = "0x0000000000000000000000000000000000000000000000000000000000000012";
            await expectRevert(
                factory.create(
                    0,
                    salt,
                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                    "AAA",
                    6,
                ),
                ERC20FactoryErrors.INVALID_NAME,
            );
        });

        it("should throw invalid symbol", async () => {
            const salt = "0x0000000000000000000000000000000000000000000000000000000000000013";
            await expectRevert(factory.create(0, salt, "aaa", "AAAAAAAAAAAAAAAAA", 6), ERC20FactoryErrors.INVALID_SYMBOL);
        });
    });
});
