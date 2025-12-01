import { Difference } from "@swisstype/essential";
import { SubmitResponse, SubmittableTransaction, TxResponse } from "xrpl";

export type XrplSubmittableTransaction = SubmittableTransaction;

export type XrplSubmitTransactionResponseResult<T extends XrplSubmittableTransaction> = Omit<SubmitResponse["result"], "tx_json"> & {
    tx_json: Difference<SubmitResponse["result"]["tx_json"], XrplSubmittableTransaction> & T;
};

export type XrplSubmitTransactionResponse<T extends XrplSubmittableTransaction> = Omit<SubmitResponse, "result"> & {
    result: XrplSubmitTransactionResponseResult<T>;
};

export type XrplTxResponseResult<T extends XrplSubmittableTransaction> = Difference<TxResponse["result"], XrplSubmittableTransaction> & T;

export type XrplTxResponse<T extends XrplSubmittableTransaction> = Omit<TxResponse, "result"> & {
    result: XrplTxResponseResult<T>;
};
