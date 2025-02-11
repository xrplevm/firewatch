import { PrecompileConfig } from "../types/precompile.types";
import { Interface } from "ethers";

export type ERC20PrecompileConfig = PrecompileConfig<{
    interface: Interface;
    amount: bigint;
    feeFund: bigint;
}>;

const erc20PrecompileABI = [
    "function transfer(address to, uint256 amount) external",
    "function mint(address to, uint256 amount) external",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function increaseAllowance(address spender, uint256 addedValue) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function burn(uint256 amount) external",
    "function burn(address account, uint256 amount) external",
    "function burnFrom(address account, uint256 amount) external",
    "function transferOwnership(address newOwner) external",
    "function owner() external view returns (address)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

export const erc20PrecompileConfig: ERC20PrecompileConfig = {
    abi: erc20PrecompileABI,
    interface: new Interface(erc20PrecompileABI),
    contractAddress: "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517",
    amount: 1n,
    feeFund: 10000000n,
};
