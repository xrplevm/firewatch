export const NetworkType = {
    MAINNET: "mainnet",
    TESTNET: "testnet",
    DEVNET: "devnet",
} as const;

export type NetworkType = (typeof NetworkType)[keyof typeof NetworkType];
