import { ethers } from "ethers";
import { Contract } from "./contract";
import { ContractWithFilters } from "../common";

export const callContractAbi = ["function value() view returns (uint256)", "event DataReceived(bytes data, uint256 amount)"];

export type ICallContractFilters = {
    DataReceived(data?: string | null, amount?: ethers.BigNumberish | null): ethers.EventFilter;
};

export interface ICallContract extends ContractWithFilters<ICallContractFilters> {
    value(): Promise<ethers.BigNumberish>;
}

export class CallContract extends Contract<ICallContract> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, callContractAbi, signerOrProvider);
    }
}
