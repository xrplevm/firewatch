import { EnhancedError, EnhancedErrorArgs } from "../../../../common/utils/error";

export enum EvmXChainWalletErrors {
    CANNOT_TRUST_COMMIT_WITH_NATIVE_TOKEN = "Cannot trust commit with native token",
    CANNOT_CHECK_COMMIT_TRUST_WITH_NATIVE_TOKEN = "Cannot check commit trust with native token",
    CANNOT_CREATE_ACCOUNT_WITH_TOKENS = "Cannot create account with tokens",
}

export class EvmXChainWalletError<E extends EvmXChainWalletErrors> extends EnhancedError<E> {
    constructor(...args: EnhancedErrorArgs<E>) {
        super(...args);
        this.name = "EvmXChainWalletError";
    }
}
