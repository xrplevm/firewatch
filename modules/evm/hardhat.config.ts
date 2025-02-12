import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { JsonTestReporter } from "@testing/mocha/reporters/json";
import moduleConfig from "./module.config.example.json";

const config: HardhatUserConfig = {
    ...moduleConfig.hardhat,
    mocha: {
        timeout: 40000,
        reporter: JsonTestReporter,
    },
};

export default config;
