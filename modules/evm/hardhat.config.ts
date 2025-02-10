import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { JsonTestReporter } from "@shared/mocha/reporters/json";
import moduleConfig from "./module.config.json";

const config: HardhatUserConfig = {
    ...moduleConfig.hardhat,
    mocha: {
        timeout: 40000,
        reporter: JsonTestReporter,
    },
};

export default config;
