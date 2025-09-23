import { CosmosModuleConfig } from './module';

// Safe process.env access
declare const process: {
    env: Record<string, string | undefined>;
};

// Safe require access
declare const require: (id: string) => any;

export type ConfigEnvironment = 'localnet' | 'devnet' | 'testnet' | 'mainnet';

/**
 * Configuration loader for Cosmos module that maintains type safety
 */
export class ConfigLoader {
    /**
     * Load configuration for the specified environment
     * @param env The environment to load configuration for
     * @returns Promise<CosmosModuleConfig> The loaded and validated configuration
     */
    static async loadConfig(env: ConfigEnvironment): Promise<CosmosModuleConfig> {
        try {
            // Use require to load the JSON configuration file
            // The path is relative to the compiled JavaScript file location
            const config = require(`../../configs/${env}.module.config.json`);
            
            // Validate the configuration structure
            this.validateConfig(config);
            
            return config;
        } catch (error) {
            throw new Error(`Failed to load configuration for environment "${env}": ${error instanceof Error ? error.message : error}`);
        }
    }
    
    /**
     * Load configuration from environment variable or default to specified environment
     * @param defaultEnv The default environment if COSMOS_ENV is not set
     * @returns Promise<CosmosModuleConfig> The loaded configuration
     */
    static async loadConfigFromEnv(defaultEnv: ConfigEnvironment = 'localnet'): Promise<CosmosModuleConfig> {
        const env = (process.env.COSMOS_ENV as ConfigEnvironment) || defaultEnv;
        return this.loadConfig(env);
    }
    
    /**
     * Validate the configuration structure and required fields
     * @param config The configuration to validate
     */
    private static validateConfig(config: any): asserts config is CosmosModuleConfig {
        if (!config) {
            throw new Error('Configuration is null or undefined');
        }
        
        // Validate network configuration
        if (!config.network) {
            throw new Error('Missing network configuration');
        }
        
        if (!config.network.id || typeof config.network.id !== 'string') {
            throw new Error('Invalid or missing network.id');
        }
        
        if (!config.network.urls || !config.network.urls.rpc) {
            throw new Error('Missing network.urls.rpc configuration');
        }
        
        if (!config.network.type || config.network.type !== 'cosmos') {
            throw new Error('Invalid network.type, must be "cosmos"');
        }
        
        // Validate bank configuration
        if (!config.bank) {
            throw new Error('Missing bank configuration');
        }
        
        if (!config.bank.account || typeof config.bank.account !== 'string') {
            throw new Error('Invalid or missing bank.account');
        }
        
        // Validate slashing configuration
        if (!config.slashing) {
            throw new Error('Missing slashing configuration');
        }
        
        if (typeof config.slashing.slashDowntimeFraction !== 'string') {
            throw new Error('Invalid slashing.slashDowntimeFraction');
        }
        
        if (typeof config.slashing.slashDoubleSignFraction !== 'string') {
            throw new Error('Invalid slashing.slashDoubleSignFraction');
        }
        
        // Validate poa configuration
        if (!config.poa) {
            throw new Error('Missing poa configuration');
        }
        
        if (!config.poa.stakedAmount || typeof config.poa.stakedAmount !== 'string') {
            throw new Error('Invalid or missing poa.stakedAmount');
        }
    }
}
