import { Utils, XChainUtils } from "../../typechain-types";
import { ethers } from "hardhat";

export async function deployLibraries(): Promise<{ Utils: string; XChainUtils: string }> {
    const Utils = await ethers.getContractFactory("Utils");
    const utils = (await Utils.deploy()) as Utils;
    await utils.deployed();

    const XChainUtils = await ethers.getContractFactory("XChainUtils", {
        libraries: {
            Utils: utils.address,
        },
    });
    const xChainUtils = (await XChainUtils.deploy()) as XChainUtils;
    await xChainUtils.deployed();

    return { Utils: utils.address, XChainUtils: xChainUtils.address };
}
