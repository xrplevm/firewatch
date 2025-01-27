import { HardhatUserConfig } from "hardhat/config";
import { DEFAULT_HARDHAT_CONFIG } from "./constants";
import { NetworkUserConfig } from "hardhat/types";
import { deepmerge } from "@shared/utils";

export class HardhatConfig {
    private _config: HardhatUserConfig = DEFAULT_HARDHAT_CONFIG;

    public constructor() {
        this._config = DEFAULT_HARDHAT_CONFIG;
    }

    public seal(): HardhatUserConfig {
        return this._config;
    }

    public withNetworkConfig(network: string, config: NetworkUserConfig): HardhatConfig {
        this._config.networks = this._config.networks || {};
        this._config.networks[network] = deepmerge(this._config.networks[network], config);
        return this;
    }
}
