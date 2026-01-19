import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import moduleConfig from "./module.config.json";

dotenv.config();

const config: HardhatUserConfig = {
    ...moduleConfig.hardhat,
    mocha: {
        timeout: 240000,
        // reporter: JsonTestReporter,
    },
};

export default config;
