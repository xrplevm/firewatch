import { ethers } from "ethers";
import { Contract } from "./contract";

export const interchainTokenServiceAbi = [
    "function interchainTransfer(bytes32 tokenId, string destinationChain, bytes destinationAddress, uint256 amount, bytes metadata, uint256 gasValue) external payable",
];

export interface IInterchainTokenService {
    interchainTransfer(
        tokenId: string,
        destinationChain: string,
        destinationAddress: string,
        amount: ethers.BigNumberish,
        metadata?: string,
        gasValue?: ethers.BigNumberish,
        options?: {
            gasValue?: ethers.BigNumberish;
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
