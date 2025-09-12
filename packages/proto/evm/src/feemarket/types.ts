// Query types generated from cosmos.evm.feemarket.v1 proto definitions

// Params defines the feemarket module parameters
export interface Params {
    noBaseFee: boolean;
    baseFeeChangeDenominator: number;
    elasticityMultiplier: number;
    enableHeight: number;
    baseFee: string;
    minGasPrice: string;
    minGasMultiplier: string;
}

// Query Service RPCs
export interface QueryParamsRequest {}

export interface QueryParamsResponse {
    params: Params;
}

export interface QueryBaseFeeRequest {}

export interface QueryBaseFeeResponse {
    baseFee: string;
}

export interface QueryBlockGasRequest {}

export interface QueryBlockGasResponse {
    gas: number;
}
