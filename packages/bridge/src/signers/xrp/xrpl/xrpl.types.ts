import { Transaction } from "@shared/modules/blockchain";
import { SubmittableTransaction, TxResponseResult } from "@shared/xrpl/transaction";

export type XrplTransaction = Transaction & { fee: string };

export type ExtendedXrplTxResponse = TxResponseResult<SubmittableTransaction> & {
    Fee: string;
    // add any other statically known members here if needed
};
