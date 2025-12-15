import { CreateBridgeRequestXChainWallet, XChainWallet } from "../interfaces";

export function isCreateBridgeRequestXChainWallet(wallet: XChainWallet): wallet is CreateBridgeRequestXChainWallet {
    return "createBridgeRequest" in wallet;
}
