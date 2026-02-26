import { EthersXChainProvider } from "../../../provider/providers/evm";
import { EthersXChainSigner } from "../../../signer/signers/evm";
import { EvmXChainWallet } from "./EvmXChainWallet";

export class EthersXChainWallet extends EvmXChainWallet {
    constructor(
        ...args: [provider: EthersXChainProvider, signer: EthersXChainSigner] | [signer: EthersXChainSigner<EthersXChainProvider>]
    ) {
        if (args.length === 2) {
            const [provider, signer] = args;
            super(provider, signer);
        } else {
            const [signer] = args;
            super(signer.provider, signer);
        }
    }
}
