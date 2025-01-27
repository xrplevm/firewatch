import { expect } from "chai";
import { erc20PrecompileConfig } from "./erc20.config";
import { ethers } from "hardhat";

describe("ERC20", () => {
    let abi;
    let contractAddress;
    let ownerContract: InstanceType<typeof ethers.Contract>;
    let userContract: InstanceType<typeof ethers.Contract>;

    let ownerSigner: any;
    let userSigner: any;

    beforeEach(async () => {
        abi = erc20PrecompileConfig.abi;
        contractAddress = erc20PrecompileConfig.contractAddress;
        [ownerSigner, userSigner] = await ethers.getSigners();

        ownerContract = new ethers.Contract(contractAddress, abi, ownerSigner);
        userContract = new ethers.Contract(contractAddress, abi, userSigner);
    });

    /**
     * 1. Mint test - ❌
     * 2. Burn test - ❌
     * 3. Burn0 test - ❌
     * 4. BurnFrom test - ❌
     * 5. Owner query test - ❌
     * 6. Transfer ownership test - ❌
     */
    describe("mint coins", () => {
        it("should mint tokens to the owner", async () => {
            // Check that the owner has 0 tokens
            const beforeBalance = await ownerContract.balanceOf(userSigner.address);

            // TODO: Change mint address
            const tx = await ownerContract.mint(userSigner.address, erc20PrecompileConfig.amount);
            await tx.wait();

            const afterBalance = await ownerContract.balanceOf(userSigner.address);
            expect(afterBalance).to.equal(beforeBalance + BigInt(erc20PrecompileConfig.amount));
        });
    });
});
