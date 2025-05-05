export type ApiResponse<T> = {
    data: T[];
    total: number;
    time_spent: number;
};

export type SearchGMP = {
    call: CallDetails;
    fees?: Fees;
    is_invalid_source_address: boolean;
    message_id: string;
    is_invalid_symbol: boolean;
    is_invalid_amount: boolean;
    time_spent: Record<string, number>;
    is_invalid_payload_hash: boolean;
    is_invalid_contract_address: boolean;
    is_invalid_destination_chain: boolean;
    is_call_from_relayer: boolean;
    is_insufficient_fee: boolean;
    is_invalid_call: boolean;
    gas_paid_to_callback?: string;
    gas: GasStats;
    no_gas_remain: boolean;
    is_not_enough_gas: boolean;
    executed?: Executed;
    not_enough_gas_to_execute: boolean;
    execute_nonce: null | number;
    to_refund: boolean;
    is_execute_from_relayer: boolean;
    id: string;
    status: string;
    simplified_status: string;
    interchain_transfer?: InterchainTransfer;
    amount?: number;
    symbol?: string;
    price?: number;
    value?: number;
    gas_paid?: GasPaid;
    confirm?: Confirm;
    approved?: Approved;
    callback?: Callback;
};

export type CallDetails = {
    chain: string;
    _id: string;
    blockNumber: string | number;
    transactionHash: string;
    parentMessageID?: string;
    eventIndex: number;
    event: string;
    returnValues: ReturnValues;
    block_timestamp: number;
    receipt: Receipt;
    transaction: Transaction;
    id: string;
    chain_type: string;
    destination_chain_type: string;
    created_at: Timestamps;
    messageIdIndex: number;
    messageIdHash: string;
    _logIndex?: number;
};

export type Receipt = {
    blockNumber: string | number;
    gasUsed: string;
    status: number;
    gasLimit: string;
    transactionHash: string;
    from: string;
};

export type Transaction = {
    blockNumber: string | number;
    timestamp?: number;
    gasLimit: string;
    gasPrice: string;
    status?: string;
    hash: string;
    from: string;
};

export type Timestamps = {
    ms: number;
    hour: number;
    day: number;
    week: number;
    month: number;
    quarter: number;
    year: number;
};

export type ReturnValues = {
    destinationContractAddress: string;
    messageId: string;
    payloadHash: string;
    sender: string;
    sourceChain: string;
    destinationChain: string;
    payload: string;
};

export type Fees = {
    source_base_fee_usd: number;
    destination_base_fee_usd: number;
    express_fee_string: string;
    express_fee: number;
    destination_base_fee_string: string;
    source_token: TokenDetails;
    express_supported: boolean;
    ethereum_token: TokenInfo;
    execute_min_gas_price: string;
    source_base_fee: number;
    axelar_token: TokenInfo;
    destination_express_fee: FeeBreakdown;
    base_fee: number;
    express_execute_gas_multiplier: number;
    destination_base_fee: number;
    express_fee_usd: number;
    destination_native_token: TokenDetails;
    execute_gas_multiplier: number;
    destination_confirm_fee: number;
    source_base_fee_string: string;
    source_express_fee: FeeBreakdown;
    base_fee_usd: number;
    source_confirm_fee: number;
};

export type TokenDetails = TokenInfo & {
    gas_price: string;
    gas_price_gwei?: string;
    gas_price_in_units: {
        decimals: number;
        value: string;
    };
    contract_address: string;
};

export type TokenInfo = {
    token_price: {
        usd: number;
    };
    symbol: string;
    decimals: number;
    name: string;
};

export type FeeBreakdown = {
    total: number;
    relayer_fee_usd: number;
    relayer_fee: number;
    total_usd: number;
    express_gas_overhead_fee: number;
    express_gas_overhead_fee_usd: number;
};

export type GasStats = {
    gas_execute_amount: number;
    gas_approve_amount: number;
    gas_callback_amount: number;
    gas_callback_approve_amount: number;
    gas_express_fee_amount: number;
    gas_used_amount: number;
    gas_remain_amount: number;
    gas_paid_amount: number;
    gas_base_fee_amount: number;
    gas_express_amount: number;
    gas_callback_base_fee_amount: number;
    gas_used_value: number;
};

export type Executed = {
    chain: string;
    sourceChain: string;
    chain_type: string;
    messageId: string;
    created_at: Timestamps;
    contract_address: string;
    sourceTransactionEventIndex: number;
    relayerAddress: string;
    transactionHash: string;
    returnValues: {
        messageId: string;
    };
    blockNumber: string | number;
    block_timestamp: number;
    receipt: Receipt;
    from: string;
    _id: string;
    sourceTransactionHash: string;
    id: string;
    event: string;
    transaction: Transaction & Record<string, any>;
    childMessageIDs?: string[];
};

export type InterchainTransfer = {
    symbol: string;
    amount: string;
    sourceAddress: string;
    destinationAddress: string;
    tokenId: string;
    dataHash: string;
    decimals: number;
    name: string;
    destinationChain: string;
    id: string;
    event: string;
    contract_address: string;
};

export type GasPaid = {
    chain: string;
    chain_type: string;
    created_at: Timestamps;
    eventIndex: number;
    transactionHash: string;
    returnValues: ReturnValues & {
        refundAddress: string;
        gasFeeAmount: string;
    };
    blockNumber: number;
    block_timestamp: number;
    receipt: Receipt;
    _id: string;
    id: string;
    event: string;
    transaction: Transaction;
    destination_chain_type: string;
};

export type Confirm = {
    sourceChain: string;
    poll_id: string;
    confirmation_txhash: string;
    blockNumber: number;
    block_timestamp: number;
    transactionIndex: number;
    sourceTransactionHash: string;
    event: string;
    contract_address: string;
    transactionHash: string;
};

export type Approved = {
    returnValues: ReturnValues & {
        sourceEventIndex: number;
        sourceAddress: string;
        sourceTxHash: string;
        contractAddress: string;
    };
    chain: string;
    chain_type: string;
    blockNumber: number;
    block_timestamp: number;
    created_at: Timestamps;
    receipt: Receipt;
    _id: string;
    eventIndex: number;
    id: string;
    event: string;
    transaction: Transaction;
};

export type Callback = Approved;
