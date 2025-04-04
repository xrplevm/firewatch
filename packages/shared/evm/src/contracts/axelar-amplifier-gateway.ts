import { ethers } from "ethers";
import { Contract } from "./contract";
import { ContractWithFilters } from "../common";

export const axelarAmplifierGatewayAbi = [
    "function callContract(string calldata destinationChain, string calldata destinationContractAddress, bytes payload)",
    "function callContractWithToken(string calldata destinationChain, string calldata destinationContractAddress, bytes calldata payload, string calldata symbol, uint256 amount) external payable",
    "event ContractCall(address indexed sender, string destinationChain, string destinationContractAddress, bytes32 indexed payloadHash, bytes payload)",
    "event ContractCallWithToken(address indexed sender, string destinationChain, string destinationContractAddress, bytes32 indexed payloadHash, bytes payload, string symbol, uint256 amount)",
];

export type IAxelarAmplifierGatewayFilters = {
    ContractCall(
        sender?: string | null,
        destinationChain?: string | null,
        destinationContractAddress?: string | null,
        payloadHash?: string | null,
    ): ethers.EventFilter;
    ContractCallWithToken(
        sender?: string | null,
        destinationChain?: string | null,
        destinationContractAddress?: string | null,
        payloadHash?: string | null,
        symbol?: string | null,
        amount?: ethers.BigNumberish | null,
    ): ethers.EventFilter;
};

export interface IAxelarAmplifierGateway extends ContractWithFilters<IAxelarAmplifierGatewayFilters> {
    callContract(destinationChain: string, destinationContractAddress: string, payload: string): Promise<ethers.ContractTransaction>;

    callContractWithToken(
        destinationChain: string,
        destinationContractAddress: string,
        payload: string,
        symbol: string,
        amount: ethers.BigNumberish,
    ): Promise<ethers.ContractTransaction>;
}

export class AxelarAmplifierGateway extends Contract<IAxelarAmplifierGateway> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, axelarAmplifierGatewayAbi, signerOrProvider);
    }
}
