import { IXrplProvider } from "../../interfaces/i-xrpl.provider";
import { IXrplFaucetWalletProviderProvider } from "./i-xrpl-faucet-wallet-provider.provider";

export interface IXrplFaucetProvider extends IXrplFaucetWalletProviderProvider, IXrplProvider {}
