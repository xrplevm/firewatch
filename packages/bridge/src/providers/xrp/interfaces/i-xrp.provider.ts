import { IProvider } from "../../core/interfaces/i-provider";
import { IXrpWalletProviderProvider } from "./i-xrp-wallet-provider.provider";

export interface IXrpProvider extends IXrpWalletProviderProvider, IProvider {}
