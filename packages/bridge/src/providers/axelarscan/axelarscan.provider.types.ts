import { GMPError, GMPStatus, EvmChain } from "@axelar-network/axelarjs-sdk";

export type LifecycleInfo = {
    status: GMPStatus | string;
    error?: GMPError;
};

export type ExtendedEvmChain = EvmChain | "xrpl-evm";

export type CreatedAt = {
    week: number;
    hour: number;
    month: number;
    year: number;
    ms: number;
    day: number;
    quarter: number;
};

export type ReturnValues = {
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

export type Receipt = {
    gasLimit: string;
    gasUsed: string;
    blockNumber: number;
    from: string;
    transactionHash: string;
    status: number;
    // these are only in some responses:
    cumulativeGasUsed?: string;
    transactionIndex?: number;
    effectiveGasPrice?: string;
};

export type TransactionInfo = {
    gasLimit: string;
    blockNumber: number;
    from: string;
    hash: string;
    status: string;
    timestamp?: number;
    gasPrice?: string;
    // fields from EVM-style txs:
    chainId?: number;
    gas?: string;
    maxPriorityFeePerGas?: string;
    maxFeePerGas?: string;
    nonce?: number;
    to?: string;
    transactionIndex?: number;
};

export type NativeGasAddedEvent = {
    chain: string;
    chain_type: string;
    created_at: CreatedAt;
    eventIndex?: number;
    transactionHash: string;
    returnValues: ReturnValues;
    blockNumber: number;
    block_timestamp: number;
    receipt: Receipt;
    _id: string;
    id: string;
    event: "NativeGasAdded";
    transaction: TransactionInfo;
    destination_chain_type: string;
    _logIndex?: number;
};

export type NativeGasAddedEventList = NativeGasAddedEvent[];
