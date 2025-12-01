import { BridgeDoor, ChainType, EthersXChainProvider, XChainWallet, XrplXChainProvider } from "xchain-sdk";
import { XrplSeedXChainWallet } from "./wallets/XrplSeedXChainWallet.js";
import { EthersPrivateKeyXChainWallet } from "./wallets/EthersPrivateKeyXChainWallet.js";
import { MAINCHAIN_DOOR } from "./doors.js";
import { MAINCHAIN_PROVIDER, SIDECHAIN_PROVIDER } from "./providers.js";

export class WalletsFactory {
    /**
     * Gets the wallet for the given door
     * @param door The bridge door
     * @param args The arguments of the wallet
     */
    static get<T extends ChainType>(
        door: BridgeDoor,
        ...args: T extends ChainType.XRP ? [seed: string] : [privateKey: string]
    ): XChainWallet {
        if (door.type === ChainType.XRP) {
            const [seed] = args;
            const provider = (door === MAINCHAIN_DOOR ? MAINCHAIN_PROVIDER : SIDECHAIN_PROVIDER) as XrplXChainProvider;
            return new XrplSeedXChainWallet(seed, provider);
        } else {
            const [privateKey] = args;
            const provider = (door === MAINCHAIN_DOOR ? MAINCHAIN_PROVIDER : SIDECHAIN_PROVIDER) as EthersXChainProvider;
            return new EthersPrivateKeyXChainWallet(privateKey, provider);
        }
    }
}
