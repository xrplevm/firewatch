import { ethers } from "ethers";
import { Contract } from "./contract";
import { ContractWithFilters } from "../common";

export const axelarGasServiceAbi = [
    "function addNativeGas(bytes32 txHash, uint256 logIndex, address refundAddress) payable",
    "event NativeGasAdded(bytes32 indexed txHash, uint256 indexed logIndex, uint256 amount, address refundAddress)",
    "event ContractCall(address indexed sender,string destinationChain,string destinationContractAddress,bytes32 indexed payloadHash,bytes payload)",
    "event ContractCallWithToken(bytes32 indexed txHash,string indexed destinationChain,address indexed destinationContractAddress,bytes payload,string symbol,uint256 amount,address refundAddress)",
];

export type IAxelarGasServiceFilters = {
    NativeGasAdded(txHash?: string | null, logIndex?: ethers.BigNumberish | null): ethers.EventFilter;
};

export interface IAxelarGasService extends ContractWithFilters<IAxelarGasServiceFilters> {
    addNativeGas(
        txHash: string,
        logIndex: ethers.BigNumberish,
        refundAddress: string,
        overrides?: {
            value?: ethers.BigNumberish;
            gasLimit?: ethers.BigNumberish;
        },
    ): Promise<ethers.ContractTransactionResponse>;
}

export class AxelarGasService extends Contract<IAxelarGasService> {
    constructor(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
        super(address, axelarGasServiceAbi, signerOrProvider);
    }
}
