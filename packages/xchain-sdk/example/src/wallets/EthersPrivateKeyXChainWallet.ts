import { Wallet } from "ethers";
import { EthersXChainProvider, EthersXChainSigner, EthersXChainWallet } from "xchain-sdk";

export class EthersPrivateKeyXChainWallet extends EthersXChainWallet {
    constructor(privateKey: string, provider: EthersXChainProvider) {
        super(new EthersXChainSigner(new Wallet(privateKey, provider.ethersProvider)));
    }
}
