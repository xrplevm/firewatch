export interface IBCAccount {
    mnemonic: string;
    address: string;
}

export interface IBCGas {
    amount: string;
    gas: string;
}

export interface IBCChain {
    account: IBCAccount;
    evm: boolean;
    chainId: string;
    rpcUrl: string;
    prefix: string;
    denom: string;
    amount: string;
    gas: IBCGas;
    channel: string;
}

export interface IBCChainPair {
    srcChain: IBCChain;
    dstChain: IBCChain;
    port: string;
    roundtrip?: boolean;
}

export interface IBCModuleConfig {
    chains: IBCChainPair[];
}
