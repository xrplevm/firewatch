import type { ethers } from "ethers";
import { Contract } from "./contract";

export const interchainTokenAbi = [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function interchainTokenId() view returns (bytes32)",
    "function interchainTransfer(string destinationChain, bytes recipient, uint256 amount, bytes metadata) external payable",
];

export interface IInterchainToken {
    balanceOf(account: string): Promise<ethers.BigNumberish>;
    approve(account: string, amount: ethers.BigNumberish): Promise<ethers.TransactionResponse>;
    allowance(owner: string, spender: string): Promise<ethers.BigNumberish>;
    interchainTokenId(): Promise<string>;
    interchainTransfer(
        destinationChain: string,
        recipient: string,
        amount: ethers.BigNumberish,
        metadata: string,
        options?: {
            gasValue?: ethers.BigNumberish;
            gasLimit?: number;
            value?: ethers.BigNumberish;
        },
    ): Promise<ethers.TransactionResponse>;
}

export class InterchainToken extends Contract<IInterchainToken> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, interchainTokenAbi, signerOrProvider);
    }
}
