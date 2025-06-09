import { ethers } from "ethers";
import { ChainType } from "@shared/modules/chain";
import { ISignerService } from "../interfaces/i-signer-service";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { EthersProvider } from "../../../bridge/src/providers/evm/ethers/ethers.provider";
import { SignerAvailability } from "../signer-service.types";

export class EvmSignerService implements ISignerService<EthersSigner> {
    private pool: SignerAvailability<EthersSigner>[] = [];
    private ethersProvider: ethers.JsonRpcProvider;
    private customEthersProvider: EthersProvider;

    constructor(rpcUrl: string) {
        this.ethersProvider = new ethers.JsonRpcProvider(rpcUrl);
        this.customEthersProvider = new EthersProvider(this.ethersProvider);
    }

    /**
     * @inheritdoc
     */
    async loadSigners(privateKeys: string[]): Promise<void> {
        this.pool = privateKeys.map((pk) => ({
            signer: new EthersSigner(new ethers.Wallet(pk, this.ethersProvider), this.customEthersProvider),
            busy: false,
        }));
    }

    /**
     * @inheritdoc
     */
    async acquireSigner(chain: ChainType): Promise<EthersSigner | null> {
        if (chain !== "evm") return null;
        const entry = this.pool.find((entry) => !entry.busy);
        if (!entry) return null;
        entry.busy = true;
        return entry.signer;
    }

    /**
     * @inheritdoc
     */
    async releaseSigner(signer: EthersSigner): Promise<void> {
        const entry = this.pool.find((entry) => entry.signer === signer);
        if (entry) entry.busy = false;
    }
}
