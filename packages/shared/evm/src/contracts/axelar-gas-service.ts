import { ethers } from "ethers";
import { Contract } from "./contract";

export const axelarGasServiceAbi = [
    "function addNativeGas(bytes32 txHash, uint256 logIndex, address refundAddress) payable",
    "event ContractCall(address indexed sender,string destinationChain,string destinationContractAddress,bytes32 indexed payloadHash,bytes payload)",
];

export interface IAxelarGasService {
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
