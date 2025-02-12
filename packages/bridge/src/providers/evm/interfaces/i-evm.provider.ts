import { IProvider } from "../../core/interfaces/i-provider";
import { IEvmWalletProviderProvider } from "./i-evm-wallet-provider.provider";

export interface IEvmProvider extends IEvmWalletProviderProvider, IProvider {}
