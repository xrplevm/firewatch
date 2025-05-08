import { ethers } from "ethers";
import { Contract } from "./contract";
import { ContractWithFilters } from "../common";

export const axelarAmplifierGatewayAbi = [
    "function callContract(string calldata destinationChain, string calldata destinationContractAddress, bytes payload)",
    "event ContractCall(address indexed sender, string destinationChain, string destinationContractAddress, bytes32 indexed payloadHash, bytes payload)",
];

export type IAxelarAmplifierGatewayFilters = {
    ContractCall(
        sender?: string | null,
        destinationChain?: string | null,
        destinationContractAddress?: string | null,
        payloadHash?: string | null,
    ): ethers.EventFilter;
};

export interface IAxelarAmplifierGateway extends ContractWithFilters<IAxelarAmplifierGatewayFilters> {
    callContract(
        destinationChain: string,
        destinationContractAddress: string,
        payload: string,
        options?: {
            gasLimit?: number;
            value?: ethers.BigNumberish;
            gasValue?: ethers.BigNumberish;
        },
    ): Promise<ethers.ContractTransactionResponse>;
}

export class AxelarAmplifierGateway extends Contract<IAxelarAmplifierGateway> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, axelarAmplifierGatewayAbi, signerOrProvider);
    }
}
