import { HardhatUserConfig } from "hardhat/config";

export const DEFAULT_HARDHAT_CONFIG: HardhatUserConfig = {
    solidity: "0.8.20",
    networks: {
        xrplevm_localnet: {
            url: "http://localhost:8545",
            gasPrice: 0,
        },
        xrplevm_devnet: {
            url: "https://rpc.xrplevm.org",
        },
        // Add relevant networks here
    },
    // Additional hardhat configurations
    mocha: {
        timeout: 40000, // Increased timeout for e2e tests
    },
};
