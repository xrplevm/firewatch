import { ethers } from "ethers";
import { Contract } from "./contract";
import { ContractWithFilters } from "../common";

export const axelarExecutableExampleAbi = [
    "constructor(address _gateway, address _gasReceiver)",
    "function message() view returns (string)",
    "function sourceChain() view returns (string)",
    "function sourceAddress() view returns (string)",
    "function gasService() view returns (address)",
    "function setRemoteValue(string destinationChain, string destinationAddress, string _message) payable",
    "event Executed(bytes32 indexed commandId, string _from, string _message)",
];

export type IAxelarExecutableExampleFilters = {
    Executed(commandId?: string | null, _from?: string | null, _message?: string | null): ethers.EventFilter;
};

export interface IAxelarExecutableExample extends ContractWithFilters<IAxelarExecutableExampleFilters> {
    message(): Promise<string>;
    sourceChain(): Promise<string>;
    sourceAddress(): Promise<string>;
    gasService(): Promise<string>;
    setRemoteValue(
        destinationChain: string,
        destinationAddress: string,
        _message: string,
        overrides?: { value?: ethers.BigNumberish },
    ): Promise<ethers.ContractTransactionResponse>;
}

export class AxelarExecutableExample extends Contract<IAxelarExecutableExample> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, axelarExecutableExampleAbi, signerOrProvider);
    }
}

// TODO remove:
// xrpl-evm
// Testnet: 0x5254aacbc2056b28f0188ab1cc4b8e9e46988b5d
// Devnet: 0x6e729095c8ebd570bc06c6ad649a3f522450074d
// Avalanche:
// Testnet/Devnet: 0x34210cefef05f60b7bd7b6793e54382dbed13ec5
