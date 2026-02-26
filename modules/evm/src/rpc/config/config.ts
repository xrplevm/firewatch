import { Block } from "../types/block.types";
import { Transaction } from "../types/transaction.types";

export type RPCConfig = {
    rpc: RPCFixtureConfig[];
};

export type RPCFixtureConfig = {
    label: string;
    block: Block;
    transaction: Transaction;
    disabledCalls: string[];
};
