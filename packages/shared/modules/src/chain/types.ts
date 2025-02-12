export const ChainType = {
    EVM: "evm",
    XRP: "xrp",
} as const;
export type ChainType = (typeof ChainType)[keyof typeof ChainType];
