import { ethers } from "ethers";
import { Contract } from "./contract";

export const interchainTokenExecutableAbi = ["function data() view returns (bytes)"];

export interface IInterchainTokenExecutable {
    data(): Promise<string>;
}

export class InterchainTokenExecutable extends Contract<IInterchainTokenExecutable> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, interchainTokenExecutableAbi, signerOrProvider);
    }
}
