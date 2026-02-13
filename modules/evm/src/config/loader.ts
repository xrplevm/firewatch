import { EVMModuleConfig } from './config';

// Safe process.env access
declare const process: {
    env: Record<string, string | undefined>;
};

// Safe require access
declare const require: (id: string) => any;

export type ConfigEnvironment = 'localnet' | 'devnet' | 'testnet' | 'mainnet';

/**
 * Configuration loader for EVM module that maintains type safety
 */
export class ConfigLoader {
    /**
     * Load configuration for the specified environment
     * @param env The environment to load configuration for
     * @returns Promise<EVMModuleConfig> The loaded and validated configuration
     */
    static async loadConfig(env: ConfigEnvironment): Promise<EVMModuleConfig> {
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
     * @param defaultEnv The default environment if EVM_ENV is not set
     * @returns Promise<EVMModuleConfig> The loaded configuration
     */
    static async loadConfigFromEnv(defaultEnv: ConfigEnvironment = 'localnet'): Promise<EVMModuleConfig> {
        const env = (process.env.EVM_ENV as ConfigEnvironment) || defaultEnv;
        return this.loadConfig(env);
    }
    
    /**
     * Validate the configuration structure and required fields
     * @param config The configuration to validate
     */
    private static validateConfig(config: any): asserts config is EVMModuleConfig {
        if (!config) {
            throw new Error('Configuration is null or undefined');
        }
        
        // Validate hardhat configuration
        if (!config.hardhat) {
            throw new Error('Missing hardhat configuration');
        }
        
        if (!config.hardhat.defaultNetwork || typeof config.hardhat.defaultNetwork !== 'string') {
            throw new Error('Invalid or missing hardhat.defaultNetwork');
        }
        
        if (!config.hardhat.networks || typeof config.hardhat.networks !== 'object') {
            throw new Error('Missing hardhat.networks configuration');
        }
        
        // Validate contracts configuration
        if (!config.contracts) {
            throw new Error('Missing contracts configuration');
        }
        
        if (!config.contracts.erc20) {
            throw new Error('Missing contracts.erc20 configuration');
        }
        
        if (!config.contracts.erc20.abi || !Array.isArray(config.contracts.erc20.abi)) {
            throw new Error('Invalid or missing contracts.erc20.abi');
        }
        
        if (!config.contracts.erc20.contractAddress || typeof config.contracts.erc20.contractAddress !== 'string') {
            throw new Error('Invalid or missing contracts.erc20.contractAddress');
        }
        
        // Validate chain configuration
        if (!config.chain) {
            throw new Error('Missing chain configuration');
        }
        
        if (!config.chain.id || typeof config.chain.id !== 'string') {
            throw new Error('Invalid or missing chain.id');
        }
        
        if (!config.chain.type || config.chain.type !== 'evm') {
            throw new Error('Invalid chain.type, must be "evm"');
        }
        
        if (typeof config.chain.chainId !== 'number') {
            throw new Error('Invalid or missing chain.chainId');
        }
    }
}
