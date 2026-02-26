// Query types generated from cosmos.evm.vm.v1 proto definitions

import { ChainConfig, Params } from "./evm";

// Query Service RPCs
export interface QueryAccountRequest {
    address: string;
}

export interface QueryAccountResponse {
    balance: string;
    codeHash: string;
    nonce: number;
}

export interface QueryCosmosAccountRequest {
    address: string;
}

export interface QueryCosmosAccountResponse {
    cosmosAddress: string;
    sequence: number;
    accountNumber: number;
}

export interface QueryValidatorAccountRequest {
    consAddress: string;
}

export interface QueryValidatorAccountResponse {
    accountAddress: string;
    sequence: number;
    accountNumber: number;
}

export interface QueryBalanceRequest {
    address: string;
}

export interface QueryBalanceResponse {
    balance: string;
}

export interface QueryStorageRequest {
    address: string;
    key: string;
}

export interface QueryStorageResponse {
    value: string;
}

export interface QueryCodeRequest {
    address: string;
}

export interface QueryCodeResponse {
    code: Uint8Array;
}

export interface QueryParamsRequest {}

export interface QueryParamsResponse {
    params: Params;
}

export interface QueryConfigRequest {}

export interface QueryConfigResponse {
    config: ChainConfig;
}
