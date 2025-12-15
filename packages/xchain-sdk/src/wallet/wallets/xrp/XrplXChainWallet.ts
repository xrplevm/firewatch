import { XrplXChainProvider } from "../../../provider/providers/xrp";
import { XrplXChainSigner } from "../../../signer/signers/xrp";
import { XrpXChainWallet } from "./XrpXChainWallet";

export class XrplXChainWallet extends XrpXChainWallet {
    constructor(...args: [provider: XrplXChainProvider, signer: XrplXChainSigner] | [signer: XrplXChainSigner<XrplXChainProvider>]) {
        if (args.length === 2) {
            const [provider, signer] = args;
            super(provider, signer);
        } else {
            const [signer] = args;
            super(signer.provider, signer);
        }
    }
}
