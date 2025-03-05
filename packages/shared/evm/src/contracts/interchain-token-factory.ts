import { ethers } from "ethers";
import { Contract } from "./contract";

export const interchainTokenFactoryAbi = [
    "function contractId() external pure returns (bytes32)",
    "function deployInterchainToken(bytes32 salt, string calldata name, string calldata symbol, uint8 decimals, uint256 initialSupply, address minter) external payable returns (bytes32)",
    "function deployRemoteInterchainToken(bytes32 salt, string calldata destinationChain, uint256 gasValue ) external payable returns (bytes32 )",
];

export interface IInterchainTokenFactory {
    contractId(): Promise<string>;

    deployInterchainToken(
        salt: ethers.BigNumberish,
        name: string,
        symbol: string,
        decimals: number,
        initialSupply: ethers.BigNumberish,
        minter: string,
    ): Promise<ethers.ContractTransactionResponse>;

    deployRemoteInterchainToken(
        salt: ethers.BigNumberish,
        destinationChain: string,
        gasValue: ethers.BigNumberish,
        overrides?: { value?: ethers.BigNumberish; gasLimit?: number },
    ): Promise<ethers.ContractTransactionResponse>;
}

export class InterchainTokenFactory extends Contract<IInterchainTokenFactory> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, interchainTokenFactoryAbi, signerOrProvider);
    }
}
