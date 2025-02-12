import { Chain } from "@firewatch/core/chain";
import { Account } from "@firewatch/core/account";
import { ModuleConfig } from "@firewatch/core/module";

/**
 * Implementation of IConfigProvider using a URL pointing to a JSON file.
 */
export class URLConfigProvider<T extends ModuleConfig<N, A>, N extends Chain, A extends Account> {
    private readonly url: string;
    private _config: T | null = null;

    constructor(url?: string) {
        if (url || process.env.CONFIG_URL) {
            this.url = (process.env.CONFIG_URL || url)!;
        } else {
            throw new Error("A url should be provided to the URLConfigProvider or define CONFIG_URL");
        }
    }

    /**
     * Fetches the config.
     * @returns The config.
     */
    async fetchConfig(): Promise<T> {
        if (!this._config) {
            const response = await fetch(this.url, { headers: { "Content-Type": "application/json" } });
            const data = await response.json();
            this._config = data as T;
            return this._config;
        }
        return this._config;
    }
}
