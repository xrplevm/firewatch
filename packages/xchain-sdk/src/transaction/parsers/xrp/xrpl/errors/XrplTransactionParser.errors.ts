import { EnhancedError, EnhancedErrorArgs } from "../../../../../common/utils/error";

export enum XrplTransactionParserErrors {
    SUBMITTED_TRANSACTION_CONTAINS_NO_HASH = "Submitted transaction contains no hash",
    CLAIM_ID_NOT_FOUND_IN_TRANSACTION = "Claim ID not found in transaction",
}

export class XrplTransactionParserError<E extends XrplTransactionParserErrors> extends EnhancedError<E> {
    constructor(...args: EnhancedErrorArgs<E>) {
        super(...args);
        this.name = "XrplTransactionParserError";
    }
}
