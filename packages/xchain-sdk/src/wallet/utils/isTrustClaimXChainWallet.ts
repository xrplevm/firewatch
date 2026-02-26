import { TrustClaimXChainWallet, XChainWallet } from "../interfaces";

export function isTrustClaimXChainWallet(wallet: XChainWallet): wallet is TrustClaimXChainWallet {
    return "isTrustClaimRequired" in wallet && "trustClaim" in wallet && "isClaimTrusted" in wallet;
}
