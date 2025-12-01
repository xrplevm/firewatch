import { BridgeDoor, GnosisSafeL2Mock } from "../../typechain-types";
import { ethers } from "hardhat";
import { DeployBridgeDoorFixture, DeployBridgeDoorResult, DeploySafeResult } from "./types";
import { deploySafeAtAddress } from "../core/deploySafeAtAddress";
import { deployLibraries } from "./deploy-libraries";

export function deployBridgeDoor(
    deploySafeResult: DeploySafeResult,
    { params }: DeployBridgeDoorFixture = { params: {} },
): () => Promise<DeployBridgeDoorResult> {
    return async function fixture() {
        let usedSafeAddress = deploySafeResult.safe.address;
        if (params.replaceSafeAddress) {
            usedSafeAddress = params.replaceSafeAddress;
            await deploySafeAtAddress(
                usedSafeAddress,
                deploySafeResult.threshold,
                deploySafeResult.witnesses.map((w) => w.address),
            );
        }
        const libraries = await deployLibraries();
        const GnosisSafeL2Mock = await ethers.getContractFactory("GnosisSafeL2Mock", { libraries: { Utils: libraries.Utils } });
        const safe = GnosisSafeL2Mock.attach(usedSafeAddress) as GnosisSafeL2Mock;

        await ethers.provider.send("hardhat_setBalance", [usedSafeAddress, "0x21E19E0C9BAB2400000"]);
        const BridgeDoorMultiToken = await ethers.getContractFactory("BridgeDoorMultiToken", {
            libraries: { XChainUtils: libraries.XChainUtils },
        });

        const bridgeDoor: BridgeDoor = (await BridgeDoorMultiToken.deploy(usedSafeAddress)) as BridgeDoor;
        await bridgeDoor.deployed();

        return { bridgeDoor, doorSafeAddress: usedSafeAddress, ...deploySafeResult, ...{ safe } };
    };
}
