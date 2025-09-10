// Types generated from cosmos.evm.vm.v1 proto definitions

export interface Params {
    evmDenom: string;
    extraEips: number[];
    allowUnprotectedTxs: boolean;
    evmChannels: string[];
    accessControl: AccessControl;
    activeStaticPrecompiles: string[];
}

export interface AccessControl {
    create: AccessControlType;
    call: AccessControlType;
}

export interface AccessControlType {
    accessType: AccessType;
    accessControlList: string[];
}

export enum AccessType {
    ACCESS_TYPE_PERMISSIONLESS = 0,
    ACCESS_TYPE_RESTRICTED = 1,
    ACCESS_TYPE_PERMISSIONED = 2,
}

export interface ChainConfig {
    homesteadBlock?: string;
    daoForkBlock?: string;
    daoForkSupport: boolean;
    eip150Block?: string;
    eip155Block?: string;
    eip158Block?: string;
    byzantiumBlock?: string;
    constantinopleBlock?: string;
    petersburgBlock?: string;
    istanbulBlock?: string;
    muirGlacierBlock?: string;
    berlinBlock?: string;
    londonBlock?: string;
    arrowGlacierBlock?: string;
    grayGlacierBlock?: string;
    mergeNetsplitBlock?: string;
    chainId: number;
    denom: string;
    decimals: number;
    shanghaiTime?: string;
    cancunTime?: string;
    pragueTime?: string;
    verkleTime?: string;
    osakaTime?: string;
}

export interface State {
    key: string;
    value: string;
}

export interface Log {
    address: string;
    topics: string[];
    data: Uint8Array;
    blockNumber: number;
    txHash: string;
    txIndex: number;
    blockHash: string;
    index: number;
    removed: boolean;
}

export interface TransactionLogs {
    hash: string;
    logs: Log[];
}

export interface TxResult {
    contractAddress: string;
    bloom: Uint8Array;
    txLogs: TransactionLogs;
    ret: Uint8Array;
    reverted: boolean;
    gasUsed: number;
}

export interface AccessTuple {
    address: string;
    storageKeys: string[];
}

export interface TraceConfig {
    tracer?: string;
    timeout?: string;
    reexec?: number;
    disableStack?: boolean;
    disableStorage?: boolean;
    debug?: boolean;
    limit?: number;
    overrides?: ChainConfig;
    enableMemory?: boolean;
    enableReturnData?: boolean;
    tracerJsonConfig?: string;
}

export interface Preinstall {
    name: string;
    address: string;
    code: string;
}
