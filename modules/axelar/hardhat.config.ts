import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import moduleConfig from "./module.config.json";

// TODO: Refactor to use @firewatch/core config.
// This is only temporary to get the project running.
const config: HardhatUserConfig = {
    ...moduleConfig.hardhat,
    mocha: {
        timeout: moduleConfig.axelar.pollingOptions.timeout,
    },
};

export default config;
