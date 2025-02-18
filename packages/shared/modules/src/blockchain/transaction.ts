export type Transaction = {
    hash: string;
    confirmed: boolean;
};

export type Unconfirmed<T extends Transaction> = {
    hash: string;
    confirmed: false;
    wait: () => Promise<Confirmed<T>>;
};

export type TransactionReceipt = {
    to: string | null;
    from: string;
    contractAddress: string | null;
    transactionIndex: number;
    gasUsed: bigint;
    logsBloom: string;
    blockHash: string;
    transactionHash: string;
    logs: any[];
    blockNumber: number;
    confirmations: number;
    cumulativeGasUsed: bigint;
    gasPrice: bigint;
    byzantium: boolean;
    type: number;
    status?: number;
    fee: string;
};

export type Confirmed<T> = T & TransactionReceipt & { confirmed: true };
