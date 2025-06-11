import { IWalletProviderSigner } from "@firewatch/bridge/signers/interfaces";

export type SignerAvailability<T extends IWalletProviderSigner = IWalletProviderSigner> = {
    signer: T;
    busy: boolean;
};
