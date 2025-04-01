import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { ConfigError } from "./errors";

/**
 * Loads the configuration for a specific module.
 *
 * If no moduleDir is provided, it defaults to the current working directory.
 *
 * @param moduleDir - The root directory of the module.
 * @returns The parsed configuration object.
 * @throws If the .env file, ENV variable, or config file is missing or invalid.
 */
export function loadModuleConfig(moduleDir: string = process.cwd()): any {
    const envFilePath = path.join(moduleDir, ".env");
    const envResult = dotenv.config({ path: envFilePath });
    if (envResult.error) {
        throw new Error(ConfigError.FailedToLoadEnv);
    }

    const env = process.env.ENV;
    if (!env) {
        throw new Error(ConfigError.EnvNotSet);
    }

    const configFilePath = path.join(moduleDir, `${env}.config.json`);
    if (!fs.existsSync(configFilePath)) {
        throw new Error(ConfigError.ConfigFileNotFound);
    }

    try {
        const configData = fs.readFileSync(configFilePath, "utf8");
        return JSON.parse(configData);
    } catch (error) {
        throw new Error(ConfigError.ConfigParseError);
    }
}
