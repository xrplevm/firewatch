import { ethers } from "ethers";
import { erc20Abi, IERC20 } from "./erc20";
import { Contract } from "./contract";

export const interchainTokenAbi = [
    "function interchainTokenService() view returns (address)",
    "function interchainTokenId() view returns (bytes32)",
];

export interface IInterchainToken extends IERC20 {
    interchainTokenService(): Promise<string>;
    interchainTokenId(): Promise<string>;
}

export class InterchainToken extends Contract<IInterchainToken> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, [...erc20Abi, ...interchainTokenAbi], signerOrProvider);
    }
}
