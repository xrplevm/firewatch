import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import moduleConfig from "./module.config.example.json";

// TODO: Refactor to use @firewatch/core config.
// This is only temporary to get the project running.
const config: HardhatUserConfig = {
    ...moduleConfig.hardhat,
    mocha: {
        timeout: 40000,
        // reporter: JsonTestReporter,
    },
};

export default config;
