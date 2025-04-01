import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { loadModuleConfig } from "@shared/modules/config";

const moduleConfig = loadModuleConfig();

const config: HardhatUserConfig = {
    ...moduleConfig.hardhat,
    mocha: {
        timeout: 40000,
        // reporter: JsonTestReporter,
    },
};

export default config;
