import { ethers } from "ethers";
import { erc20Abi, IERC20 } from "./erc20";
import { Contract } from "./contract";

export const interchainTokenAbi = [
    "function interchainTokenService() view returns (address)",
    "function decimals() view returns (uint8)",
    "function name() view returns (string)",
    "function balanceOf(address account) view returns (uint256)",
    "function interchainTokenId() view returns (bytes32)",
    "function interchainTransfer(string destinationChain, bytes recipient, uint256 amount, bytes metadata) external payable",
];

export interface IInterchainToken extends IERC20 {
    interchainTokenService(): Promise<string>;
    interchainTokenId(): Promise<string>;
    balanceOf(account: string): Promise<ethers.BigNumberish>;
    decimals(): Promise<number>;
    interchainTransfer(
        destinationChain: string,
        recipient: string, // Hex string representing the recipient bytes
        amount: ethers.BigNumberish,
        metadata: string,
        options?: {
            gasLimit?: number;
            value?: ethers.BigNumberish;
        },
    ): Promise<ethers.ContractTransactionResponse>;
}

export class InterchainToken extends Contract<IInterchainToken> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, [...erc20Abi, ...interchainTokenAbi], signerOrProvider);
    }
}
