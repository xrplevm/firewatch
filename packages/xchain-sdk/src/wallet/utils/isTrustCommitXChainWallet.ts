import { TrustCommitXChainWallet, XChainWallet } from "../interfaces";

export function isTrustCommitXChainWallet(wallet: XChainWallet): wallet is TrustCommitXChainWallet {
    return "isTrustCommitRequired" in wallet && "trustCommit" in wallet && "isCommitTrusted" in wallet;
}
