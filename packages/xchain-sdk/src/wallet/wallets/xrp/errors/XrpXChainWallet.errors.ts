import { EnhancedError, EnhancedErrorArgs } from "../../../../common/utils/error";

export enum XrpXChainWalletErrors {
    CANNOT_TRUST_CLAIM_WITH_NATIVE_CURRENCY = "Cannot trust commit with then native currency",
    CANNOT_CHECK_CLAIM_TRUST_WITH_NATIVE_CURRENCY = "Cannot check commit trust with the native currency",
    CANNOT_CREATE_ACCOUNT_WITH_IOU_CURRENCY = "Cannot create account with an IOU currency",
}

export class XrpXChainWalletError<E extends XrpXChainWalletErrors> extends EnhancedError<E> {
    constructor(...args: EnhancedErrorArgs<E>) {
        super(...args);
        this.name = "XrpXChainWalletError";
    }
}
