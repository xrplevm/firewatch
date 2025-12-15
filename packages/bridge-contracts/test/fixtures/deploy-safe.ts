import { GnosisSafeL2Mock } from "../../typechain-types";
import { ethers } from "hardhat";
import { DeploySafeFixture, DeploySafeResult } from "./types";
import { deployLibraries } from "./deploy-libraries";

export function deploySafe({ params: { witnessNumber, threshold } }: DeploySafeFixture): () => Promise<DeploySafeResult> {
    return async function fixture() {
        const libraries = await deployLibraries();
        const GnosisSafeL2Mock = await ethers.getContractFactory("GnosisSafeL2Mock", { libraries: { Utils: libraries.Utils } });
        const signers = await ethers.getSigners();
        const witnesses = signers.slice(0, witnessNumber);
        const users = signers.slice(witnessNumber);

        const safe = (await GnosisSafeL2Mock.deploy(
            witnesses.map((_) => _.address),
            threshold,
        )) as GnosisSafeL2Mock;
        await safe.deployed();

        return { witnesses, users, safe, threshold };
    };
}
