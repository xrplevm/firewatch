import { ethers } from "ethers";
import { Contract } from "./contract";

export const axelarAmplifierGatewayAbi = [
    "function callContract(string calldata destinationChain, string calldata destinationContractAddress, bytes payload)",
];

export interface IAxelarAmplifierGateway {
    callContract(destinationChain: string, destinationContractAddress: string, payload: string): Promise<ethers.ContractTransaction>;
}

export class AxelarAmplifierGateway extends Contract<IAxelarAmplifierGateway> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider) {
        super(address, axelarAmplifierGatewayAbi, signerOrProvider);
    }
}
