import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
    solidity: "0.8.20",
    networks: {
        xrplevm_localnet: {
            url: "http://localhost:8545",
            accounts: [
                process.env.CONTRACT_PRIVATE_KEY || "1bacb3ef3d80d8f148299bd21a56d9a78048dc2e20ddab25713a408f2d1f4d5e",
                process.env.USER_PRIVATE_KEY || "d8161fd5fdf4eb216a6556dc639a2543b0ed9abdbceb9971fe08cfba56f588c8",
            ],
            gasPrice: 0,
        },
    },
    mocha: {
        timeout: 40000,
        // reporter: JsonTestReporter,
    },
};

export default config;
