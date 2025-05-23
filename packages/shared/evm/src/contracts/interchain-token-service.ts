import type { ethers } from "ethers";
import { Contract } from "./contract";
import { ContractWithFilters } from "../common";

export const interchainTokenServiceAbi = [
    "function interchainTransfer(bytes32 tokenId, string destinationChain, bytes destinationAddress, uint256 amount, bytes metadata, uint256 gasValue) external payable",
    "event ContractCall(address indexed sender,string destinationChain,string destinationContractAddress,bytes32 indexed payloadHash,bytes payload)",

    "event InterchainTokenDeployed(bytes32 indexed tokenId, address tokenAddress, address indexed minter, string name, string symbol, uint8 decimals)",
];

export type IInterchainTokenServiceFilters = {
    InterchainTokenDeployed(
        tokenId?: string | null,
        tokenAddress?: string | null,
        minter?: string | null,
        name?: null,
        symbol?: null,
        decimals?: number | null,
    ): ethers.EventFilter;
};

export interface IInterchainTokenService extends ContractWithFilters<IInterchainTokenServiceFilters> {
    interchainTransfer(
        tokenId: string,
        destinationChain: string,
        destinationAddress: string,
        amount: ethers.BigNumberish,
        metadata?: string,
        gasValue?: ethers.BigNumberish,
        options?: {
            gasLimit?: number;
            value?: ethers.BigNumberish;
        },
    ): Promise<ethers.TransactionResponse>;
}

export class InterchainTokenService extends Contract<IInterchainTokenService> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, interchainTokenServiceAbi, signerOrProvider);
    }
}
