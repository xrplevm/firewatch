import type { ethers } from "ethers";
import { Contract } from "./contract";
import { ContractWithFilters } from "../common";

export const erc20Abi = [
    "function mint(address account, uint256 amount) external",
    "function burn(address account, uint256 amount) external",
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",

    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Mint(address indexed account, uint256 value)",
    "event Burn(address indexed account, uint256 value)",
];

export type IERC20Filters = {
    Transfer(from?: string | null, to?: string | null, value?: ethers.BigNumberish | null): ethers.EventFilter;
    Mint(account?: string | null, value?: ethers.BigNumberish | null): ethers.EventFilter;
    Burn(account?: string | null, value?: ethers.BigNumberish | null): ethers.EventFilter;
};

export interface IERC20 extends ContractWithFilters<IERC20Filters> {
    balanceOf(account: string): Promise<ethers.BigNumberish>;
    approve(account: string, amount: ethers.BigNumberish): Promise<ethers.TransactionResponse>;
    allowance(owner: string, spender: string): Promise<ethers.BigNumberish>;
    mint(account: string, amount: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
    burn(account: string, amount: ethers.BigNumberish): Promise<ethers.ContractTransaction>;
}

export class ERC20 extends Contract<IERC20> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, erc20Abi, signerOrProvider);
    }
}
