import { ChainType } from "../../common";
import { XChainWalletProvider } from "./XChainWalletProvider";

export interface CreateBridgeRequestXChainWalletProvider<T extends ChainType = ChainType> extends XChainWalletProvider<T> {}
