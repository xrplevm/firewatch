import { ChainType } from "@shared/modules/chain";
import { ISignerService } from "../interfaces/i-signer-service";
import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Wallet } from "xrpl";
import { SignerAvailability } from "../signer-service.types";

export class XrplSignerService implements ISignerService<XrplSigner> {
    private pool: SignerAvailability<XrplSigner>[] = [];
    private provider: XrplProvider;

    constructor(provider: XrplProvider) {
        this.provider = provider;
    }

    /**
     * @inheritdoc
     */
    async loadSigners(seeds: string[]): Promise<void> {
        this.pool = seeds.map((seed) => ({
            signer: new XrplSigner(Wallet.fromSeed(seed), this.provider),
            busy: false,
        }));
    }

    /**
     * @inheritdoc
     */
    async acquireSigner(chain: ChainType): Promise<XrplSigner | null> {
        if (chain !== "xrp") return null;
        const entry = this.pool.find((entry) => !entry.busy);
        if (!entry) return null;
        entry.busy = true;
        return entry.signer;
    }

    /**
     * @inheritdoc
     */
    async releaseSigner(signer: XrplSigner): Promise<void> {
        const entry = this.pool.find((entry) => entry.signer === signer);
        if (entry) entry.busy = false;
    }
}
