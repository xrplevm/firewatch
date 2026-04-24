import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, toBigInt } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { executeTx, expectRevert } from "@testing/hardhat/utils";
import { describeOrSkip } from "@testing/mocha/utils";
import { isChainEnvironment } from "@testing/mocha/assertions";
import { ERC20Errors } from "../../../src/precompiles/erc20/errors/errors";
import moduleConfig from "../../../module.config.json";
import { Chain } from "@firewatch/core/chain";
import { ProposalStatus } from "@firewatch/cosmos/gov";
import { CosmosConfig, expectOwnerAddresses, expectTokenPairOwnerAddresses, getCosmosConfig, hexToBech32 } from "./utils/cosmos";
import { addMinter, ensureOwnerOnlyMinter, removeMinter } from "./utils/minters";
import { expectMinterCanMintAndBurn, resetOwnerState } from "./utils/helpers";

// Fixed hex for a "bob" address used only to exercise 3-minter set membership via
// governance add/remove. No signer is derived from it - it never submits EVM txs.
const BOB_HEX = "0x1234567890123456789012345678901234567890";
const UNREGISTERED_DENOM = "nonexistenttoken";

describeOrSkip("ERC20 Multi-Minter", isChainEnvironment(["localnet"], moduleConfig.chain as unknown as Chain), () => {
    let ownerSigner: HardhatEthersSigner;
    let aliceSigner: HardhatEthersSigner;
    let contractAsOwner: Contract;
    let contractAsAlice: Contract;

    let ownerBech32: string;
    let aliceBech32: string;
    let bobBech32: string;
    let cosmosConfig: CosmosConfig;

    const { erc20 } = moduleConfig.contracts;
    const tokenAmount = toBigInt(erc20.amount);

    before(async () => {
        [ownerSigner, aliceSigner] = await ethers.getSigners();

        contractAsOwner = new ethers.Contract(erc20.contractAddress, erc20.abi, ownerSigner);
        contractAsAlice = new ethers.Contract(erc20.contractAddress, erc20.abi, aliceSigner);
        cosmosConfig = getCosmosConfig(moduleConfig);
        ownerBech32 = hexToBech32(cosmosConfig.prefix, ownerSigner.address);
        aliceBech32 = hexToBech32(cosmosConfig.prefix, aliceSigner.address);
        bobBech32 = hexToBech32(cosmosConfig.prefix, BOB_HEX);
    });

    // Baseline assumes chain genesis registers the erc20 pair with `ownerBech32` (derived
    // from hardhat signer[0] via ethermint-style bech32) as the sole minter. If the genesis
    // owner changes, the baseline assertion inside ensureOwnerOnlyMinter breaks.
    beforeEach(async () => {
        await ensureOwnerOnlyMinter(cosmosConfig, erc20.contractAddress, ownerBech32);
    });

    afterEach(async () => {
        await resetOwnerState(contractAsOwner, contractAsAlice, ownerSigner, aliceSigner);
    });

    after(async () => {
        await ensureOwnerOnlyMinter(cosmosConfig, erc20.contractAddress, ownerBech32);
    });

    describe("Add minter", () => {
        it("should add alice by denom, update both queries, and keep owner authorized", async () => {
            const { status } = await addMinter(cosmosConfig, cosmosConfig.denom, aliceBech32);

            expect(status).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32, aliceBech32]);

            // Alice acts as faucet so the owner can cover gas for its own mint/burn.
            await executeTx(contractAsAlice.transfer(ownerSigner.address, erc20.faucetFund));
            await expectMinterCanMintAndBurn(contractAsOwner, contractAsAlice, aliceSigner.address, tokenAmount);
        });

        it("should add alice by contract address, update both queries, and authorize alice", async () => {
            const { status } = await addMinter(cosmosConfig, erc20.contractAddress, aliceBech32);

            expect(status).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32, aliceBech32]);
            await expectMinterCanMintAndBurn(contractAsAlice, contractAsOwner, ownerSigner.address, tokenAmount);
        });
    });

    describe("Remove minter", () => {
        it("should remove alice by denom, update both queries, and revoke alice access", async () => {
            const { status: addStatus } = await addMinter(cosmosConfig, cosmosConfig.denom, aliceBech32);

            expect(addStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32, aliceBech32]);

            const { status: removeStatus } = await removeMinter(cosmosConfig, cosmosConfig.denom, aliceBech32);

            expect(removeStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32]);
            await expectRevert(contractAsAlice.mint(aliceSigner.address, tokenAmount), ERC20Errors.MINTER_IS_NOT_OWNER);
            await expectRevert(contractAsAlice["burn(address,uint256)"](aliceSigner.address, tokenAmount), ERC20Errors.SENDER_IS_NOT_OWNER);
        });

        it("should remove alice by contract address, update both queries, and revoke alice access", async () => {
            const { status: addStatus } = await addMinter(cosmosConfig, erc20.contractAddress, aliceBech32);

            expect(addStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32, aliceBech32]);

            const { status: removeStatus } = await removeMinter(cosmosConfig, erc20.contractAddress, aliceBech32);

            expect(removeStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32]);
            await expectRevert(contractAsAlice.mint(aliceSigner.address, tokenAmount), ERC20Errors.MINTER_IS_NOT_OWNER);
            await expectRevert(contractAsAlice["burn(address,uint256)"](aliceSigner.address, tokenAmount), ERC20Errors.SENDER_IS_NOT_OWNER);
        });
    });

    describe("Cycles", () => {
        it("should re-authorize alice after a full add-remove-add cycle", async () => {
            const { status: firstAddStatus } = await addMinter(cosmosConfig, cosmosConfig.denom, aliceBech32);
            expect(firstAddStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32, aliceBech32]);

            const { status: removeStatus } = await removeMinter(cosmosConfig, cosmosConfig.denom, aliceBech32);
            expect(removeStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32]);
            await expectRevert(contractAsAlice.mint(aliceSigner.address, tokenAmount), ERC20Errors.MINTER_IS_NOT_OWNER);
            await expectRevert(contractAsAlice["burn(address,uint256)"](aliceSigner.address, tokenAmount), ERC20Errors.SENDER_IS_NOT_OWNER);

            const { status: secondAddStatus } = await addMinter(cosmosConfig, erc20.contractAddress, aliceBech32);
            expect(secondAddStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32, aliceBech32]);
            await expectMinterCanMintAndBurn(contractAsAlice, contractAsOwner, ownerSigner.address, tokenAmount);
        });

        it("should support 3 minters and revoke them individually", async () => {
            const { status: addAliceStatus } = await addMinter(cosmosConfig, cosmosConfig.denom, aliceBech32);
            expect(addAliceStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);

            const { status: addBobStatus } = await addMinter(cosmosConfig, erc20.contractAddress, bobBech32);
            expect(addBobStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);

            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [
                ownerBech32,
                aliceBech32,
                bobBech32,
            ]);
            await expectMinterCanMintAndBurn(contractAsAlice, contractAsOwner, ownerSigner.address, tokenAmount);

            const { status: removeBobStatus } = await removeMinter(cosmosConfig, cosmosConfig.denom, bobBech32);
            expect(removeBobStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32, aliceBech32]);

            const { status: removeAliceStatus } = await removeMinter(cosmosConfig, erc20.contractAddress, aliceBech32);
            expect(removeAliceStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32]);
        });
    });

    describe("Backwards compatibility", () => {
        it("should populate deprecated owner_address field on TokenPair with the first minter", async () => {
            await expectTokenPairOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32]);

            const { status: addStatus } = await addMinter(cosmosConfig, cosmosConfig.denom, aliceBech32);
            expect(addStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectTokenPairOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32, aliceBech32]);

            const { status: removeStatus } = await removeMinter(cosmosConfig, cosmosConfig.denom, aliceBech32);
            expect(removeStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectTokenPairOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32]);
        });
    });

    describe("Error cases", () => {
        it("should fail to add ownerSigner as minter when it already exists and keep the owner set unchanged", async () => {
            const { status } = await addMinter(cosmosConfig, erc20.contractAddress, ownerBech32);

            expect(status).to.equal(ProposalStatus.PROPOSAL_STATUS_FAILED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32]);
        });

        it("should fail to re-add alice through a different token identifier", async () => {
            const { status: addStatus } = await addMinter(cosmosConfig, cosmosConfig.denom, aliceBech32);
            expect(addStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_PASSED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32, aliceBech32]);

            const { status: duplicateStatus } = await addMinter(cosmosConfig, erc20.contractAddress, aliceBech32);
            expect(duplicateStatus).to.equal(ProposalStatus.PROPOSAL_STATUS_FAILED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32, aliceBech32]);
        });

        it("should fail to remove ownerSigner as the last minter and keep the owner set unchanged", async () => {
            const { status } = await removeMinter(cosmosConfig, cosmosConfig.denom, ownerBech32);

            expect(status).to.equal(ProposalStatus.PROPOSAL_STATUS_FAILED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32]);
        });

        it("should fail to remove a non-existent minter and keep the owner set unchanged", async () => {
            const { status } = await removeMinter(cosmosConfig, erc20.contractAddress, aliceBech32);

            expect(status).to.equal(ProposalStatus.PROPOSAL_STATUS_FAILED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32]);
        });

        it("should fail to add a minter to an unregistered token and keep the owner set unchanged", async () => {
            const { status } = await addMinter(cosmosConfig, UNREGISTERED_DENOM, aliceBech32);

            expect(status).to.equal(ProposalStatus.PROPOSAL_STATUS_FAILED);
            await expectOwnerAddresses(cosmosConfig.rpcUrl, erc20.contractAddress, cosmosConfig.denom, [ownerBech32]);
        });
    });
});
