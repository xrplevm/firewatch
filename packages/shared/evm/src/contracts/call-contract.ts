import { ethers } from "ethers";
import { Contract } from "./contract";

export const callContractAbi = [
    "function setRemoteValue(string calldata destinationChain, string calldata destinationAddress, string calldata _message) external payable",
    "function message() view returns (string)",
    "function sourceChain() view returns (string)",
    "function sourceAddress() view returns (string)",
    "event Executed(bytes32 commandId, string _from, string _message)",
];

export interface ICallContract {
    setRemoteValue(destinationChain: string, destinationAddress: string, _message: string): Promise<ethers.ContractTransaction>;
    message(): Promise<string>;
    sourceChain(): Promise<string>;
    sourceAddress(): Promise<string>;

    filters: {
        Executed(commandId?: string | null, _from?: string | null, _message?: string | null): ethers.EventFilter;
    };
}

export class CallContract extends Contract<ICallContract> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, callContractAbi, signerOrProvider);
    }
}
