import { ethers } from "ethers";
import { Contract } from "./contract";
import { ContractWithFilters } from "../common";

export const interchainTokenExecutableAbi = [
    "constructor(address interchainTokenService_)",
    "function interchainTokenService() view returns (address)",
    "function value() view returns (uint256)",
    "function data() view returns (bytes)",
    "function executeWithInterchainToken(bytes32 commandId, string sourceChain, bytes sourceAddress, bytes data, bytes32 tokenId, address token, uint256 amount) external returns (bytes32)",
    "event DataReceived(bytes data, uint256 amount)",
];

export type IInterchainTokenExecutableFilters = {
    DataReceived(data?: null, amount?: null): ethers.EventFilter;
};

export interface IInterchainTokenExecutable extends ContractWithFilters<IInterchainTokenExecutableFilters> {
    interchainTokenService(): Promise<string>;
    value(): Promise<ethers.BigNumberish>;
    data(): Promise<string>;
    executeWithInterchainToken(
        commandId: string,
        sourceChain: string,
        sourceAddress: ethers.BytesLike,
        data: ethers.BytesLike,
        tokenId: string,
        token: string,
        amount: ethers.BigNumberish,
    ): Promise<ethers.ContractTransactionResponse>;
}

export class InterchainTokenExecutable extends Contract<IInterchainTokenExecutable> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, interchainTokenExecutableAbi, signerOrProvider);
    }
}
