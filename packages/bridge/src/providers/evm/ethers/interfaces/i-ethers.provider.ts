import { IEthersSignerProvider } from "../../../../signers/evm/ethers/interfaces/i-ethers-signer.provider";
import { IEvmProvider } from "../../interfaces/i-evm.provider";

export interface IEthersProvider extends IEvmProvider, IEthersSignerProvider {}
