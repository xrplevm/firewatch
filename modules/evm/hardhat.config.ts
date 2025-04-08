import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import moduleConfig from "./config/local.config.example.json";

const config: HardhatUserConfig = {
    ...moduleConfig.hardhat,
    mocha: {
        timeout: 40000,
        // reporter: JsonTestReporter,
    },
};

export default config;
