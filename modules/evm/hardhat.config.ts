import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { ConfigLoader, ConfigEnvironment } from "./src/config/loader";

// Get environment from EVM_ENV or default to localnet
const env = (process.env.EVM_ENV as ConfigEnvironment) || 'localnet';

// Load configuration synchronously for Hardhat
let moduleConfig: any;
try {
    // Use require to load the configuration synchronously
    moduleConfig = require(`./configs/${env}.module.config.json`);
} catch (error) {
    console.error(`Failed to load configuration for environment "${env}":`, error);
    throw error;
}

const config: HardhatUserConfig = {
    ...moduleConfig.hardhat,
    mocha: {
        timeout: 240000,
        // reporter: JsonTestReporter,
    },
};

export default config;
