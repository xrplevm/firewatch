const moduleConfig = require("./module.config.json");

module.exports = {
    require: "ts-node/register",
    timeout: moduleConfig.axelar.pollingOptions.timeout,
    parallel: true,
    spec: "test/**/*.test.ts",
    ignore: moduleConfig.axelar.excludeTests || [],
};
