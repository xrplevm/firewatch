import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { HardhatConfig } from "@shared/config/hardhat";

const config: HardhatUserConfig = new HardhatConfig()
    .withNetworkConfig("xrplevm_localnet", {
        accounts: [
            process.env.CONTRACT_PRIVATE_KEY || "1bacb3ef3d80d8f148299bd21a56d9a78048dc2e20ddab25713a408f2d1f4d5e",
            process.env.USER_PRIVATE_KEY || "d8161fd5fdf4eb216a6556dc639a2543b0ed9abdbceb9971fe08cfba56f588c8",
        ],
    })
    .seal();

export default config;
