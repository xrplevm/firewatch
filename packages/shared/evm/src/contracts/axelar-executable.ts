import { ethers } from "ethers";
import { Contract } from "./contract";
import { ContractWithFilters } from "../common";

export const axelarExecutableAbi = [
    "function lastPayload() view returns (bytes)",
    "event Executed(bytes32 indexed commandId, string _from, string _message)",
];

export type IAxelarExecutableFilters = {
    Executed(commandId?: string | null, _from?: string | null, _message?: string | null): ethers.EventFilter;
};

export interface IAxelarExecutable extends ContractWithFilters<IAxelarExecutableFilters> {
    lastPayload(): Promise<string>;
}

export class AxelarExecutable extends Contract<IAxelarExecutable> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, axelarExecutableAbi, signerOrProvider);
    }
}
