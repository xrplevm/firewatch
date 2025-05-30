import { GMPError, GMPStatus, EvmChain } from "@axelar-network/axelarjs-sdk";

export type LifecycleInfo = {
    status: GMPStatus | string;
    error?: GMPError;
};

export type ExtendedEvmChain = EvmChain | "xrpl-evm";

export type TimeProperties = {
    ms: number;
    hour: number;
    day: number;
    week: number;
    month: number;
    quarter: number;
    year: number;
};

export type GasAddedReturnValues = {
    refundAddress: string;
    sourceChain: string;
    sourceAddress: string;
    destinationAddress: string;
    gasFeeAmount: string;
    destinationContractAddress: string;
    sender: string;
    payload: string;
    messageId: string;
    payloadHash: string;
    destinationChain: string;
};

export type GasAddedReceipt = {
    gasLimit: string;
    gasUsed?: string;
    blockNumber: number;
    from: string;
    transactionHash: string;
    status: number;
    transactionIndex?: number;
    effectiveGasPrice?: string;
    cumulativeGasUsed?: string;
};

export type GasAddedTransaction = {
    gasLimit: string;
    blockNumber: number;
    from: string;
    hash: string;
    status?: string;
    timestamp?: number;
    gasPrice?: string;
    chainId?: number;
    gas?: string;
    maxPriorityFeePerGas?: string;
    maxFeePerGas?: string;
    nonce?: number;
    to?: string;
    transactionIndex?: number;
};

export type GasAddedTx = {
    chain: string;
    chain_type: string;
    created_at: TimeProperties;
    transactionHash: string;
    returnValues: GasAddedReturnValues;
    blockNumber: number;
    block_timestamp: number;
    receipt: GasAddedReceipt;
    _id: string;
    id: string;
    event: string;
    transaction: GasAddedTransaction;
    destination_chain_type: string;
    eventIndex?: number;
    _logIndex?: number;
};

export type GasAddedTransactions = GasAddedTx[];
