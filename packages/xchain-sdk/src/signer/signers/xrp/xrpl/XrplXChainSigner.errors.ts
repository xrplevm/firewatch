import { EnhancedError, EnhancedErrorArgs } from "../../../../common/utils/error";

export enum XrplXChainSignerErrors {
    TRANSACTION_SUBMISSION_FAILED = "Transaction submission failed with code: {{code}}",
}

export class XrplXChainSignerError<E extends XrplXChainSignerErrors> extends EnhancedError<E> {
    constructor(...args: EnhancedErrorArgs<E>) {
        super(...args);
        this.name = "XrplXChainSignerError";
    }
}
