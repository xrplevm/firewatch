import { ethers } from "ethers";
import { Contract } from "./contract";
import { ContractWithFilters } from "../common";

export const axelarExecutableExampleAbi = [
    "function lastPayload() view returns (bytes)",
    "function lastCommandId() view returns (bytes32)",
    "event Executed(bytes32 indexed commandId, string _from, string _message)",
];

export type IAxelarExecutableExampleFilters = {
    Executed(commandId?: string | null, _from?: string | null, _message?: string | null): ethers.EventFilter;
};

export interface IAxelarExecutableExample extends ContractWithFilters<IAxelarExecutableExampleFilters> {
    lastPayload(): Promise<string>;
    lastCommandId(): Promise<string>;
}

export class AxelarExecutableExample extends Contract<IAxelarExecutableExample> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, axelarExecutableExampleAbi, signerOrProvider);
    }
}

// TODO remove:
// xrpl-evm
// Testnet:    0x31393E1428762BCa4224C015138CDEF9a6edbfe1
// Devnet:
// Avalanche:
// Testnet/Devnet:
