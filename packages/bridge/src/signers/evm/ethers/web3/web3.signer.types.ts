export type Web3Chain = {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
    blockExplorerUrls: string[];
    nativeCurrency: {
        symbol: string;
        decimals: number;
    };
};
