import { BaseContract as EthersContract, type ethers } from "ethers";

export const Contract = EthersContract as unknown as new <T>(
    address: string,
    abi: ethers.InterfaceAbi,
    signerOrProvider: ethers.Signer | ethers.Provider,
) => EthersContract & T;
