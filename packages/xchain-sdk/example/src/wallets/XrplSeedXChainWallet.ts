import { XrplXChainProvider, XrplXChainSigner, XrplXChainWallet } from "xchain-sdk";
import { Wallet } from "xrpl";

export class XrplSeedXChainWallet extends XrplXChainWallet {
    constructor(seed: string, provider: XrplXChainProvider) {
        super(new XrplXChainSigner(Wallet.fromSeed(seed), provider));
    }
}
