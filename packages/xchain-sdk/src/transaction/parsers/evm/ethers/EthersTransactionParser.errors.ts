import { EnhancedError, EnhancedErrorArgs } from "../../../../common/utils/error";

export enum EthersTransactionParserErrors {
    CONTRACT_TRANSACTION_IS_NOT_A_CLAIM_ID = "Contract transaction is not a claim id.",
}

export class EthersTransactionParserError<E extends EthersTransactionParserErrors> extends EnhancedError<E> {
    constructor(...args: EnhancedErrorArgs<E>) {
        super(...args);
        this.name = "EthersTransactionParserError";
    }
}
