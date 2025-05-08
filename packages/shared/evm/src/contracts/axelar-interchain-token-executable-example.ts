import { ethers } from "ethers";
import { Contract } from "./contract";
import { ContractWithFilters } from "../common";

export const interchainTokenExecutableAbi = [
    "constructor(address interchainTokenService_)",
    "function interchainTokenService() view returns (address)",
    "function value() view returns (uint256)",
    "function executeWithInterchainToken(bytes32 commandId, string sourceChain, bytes sourceAddress, bytes data, bytes32 tokenId, address token, uint256 amount) external returns (bytes32)",
    "event DataReceived(bytes data, uint256 amount)",
];

export type IInterchainTokenExecutableFilters = {
    DataReceived(data?: null, amount?: null): ethers.EventFilter;
};

export interface IInterchainTokenExecutable extends ContractWithFilters<IInterchainTokenExecutableFilters> {
    interchainTokenService(): Promise<string>;
    value(): Promise<ethers.BigNumberish>;
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

// TODO remove:
// Testnet: 0x1a0d17da6966e9b03845c3ef9f87621884bc6874
// Devnet: 0xc3ca371ca074664eda4c4a5e6b56cc2b64ce9870
