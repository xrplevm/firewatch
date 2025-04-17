export const ChainType = {
    EVM: "evm",
    XRP: "xrp",
    COSMOS: "cosmos",
} as const;
export type ChainType = (typeof ChainType)[keyof typeof ChainType];
