import { ethers } from "ethers";
import { Contract } from "./contract";

export const axelarAmplifierGatewayAbi = [
    "function callContract(string calldata destinationChain, string calldata destinationContractAddress, bytes payload)",
    "event ContractCall(address indexed sender, string destinationChain, string destinationContractAddress, bytes32 indexed payloadHash, bytes payload)",
];

export interface IAxelarAmplifierGateway {
    callContract(destinationChain: string, destinationContractAddress: string, payload: string): Promise<ethers.ContractTransaction>;

    filters: {
        ContractCall(
            sender?: string | null,
            destinationChain?: string | null,
            destinationContractAddress?: string | null,
            payloadHash?: string | null,
        ): ethers.EventFilter;
    };
}

export class AxelarAmplifierGateway extends Contract<IAxelarAmplifierGateway> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, axelarAmplifierGatewayAbi, signerOrProvider);
    }
}
