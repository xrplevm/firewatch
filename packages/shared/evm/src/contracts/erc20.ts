import type { ethers } from "ethers";
import { Contract } from "./contract";

export const erc20Abi = [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
];

export interface IERC20 {
    balanceOf(account: string): Promise<ethers.BigNumberish>;
    approve(account: string, amount: ethers.BigNumberish): Promise<ethers.TransactionResponse>;
    allowance(owner: string, spender: string): Promise<ethers.BigNumberish>;
}

export class ERC20 extends Contract<IERC20> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, erc20Abi, signerOrProvider);
    }
}
