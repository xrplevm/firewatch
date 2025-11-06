import { ConfigLoader, ConfigEnvironment } from '../config/loader';
import { CosmosModuleConfig } from '../config/module';

// Safe process.env access
declare const process: {
    env: Record<string, string | undefined>;
};

/**
 * Test utility for loading configurations in a type-safe manner
 */
export class TestConfigLoader {
    private static configCache: Map<ConfigEnvironment, CosmosModuleConfig> = new Map();
    
    /**
     * Load configuration for tests with caching
     * @param env The environment to load, defaults to COSMOS_ENV or 'localnet'
     * @returns Promise<CosmosModuleConfig> The loaded configuration
     */
    static async getTestConfig(env?: ConfigEnvironment): Promise<CosmosModuleConfig> {
        const targetEnv = env || (process.env.COSMOS_ENV as ConfigEnvironment) || 'localnet';
        
        // Check cache first
        if (this.configCache.has(targetEnv)) {
            return this.configCache.get(targetEnv)!;
        }
        
        // Load and cache the configuration
        const config = await ConfigLoader.loadConfig(targetEnv);
        this.configCache.set(targetEnv, config);
        
        return config;
    }
    
    /**
     * Clear the configuration cache (useful for tests that need fresh configs)
     */
    static clearCache(): void {
        this.configCache.clear();
    }
    
    /**
     * Get the current environment name
     * @returns ConfigEnvironment The current environment
     */
    static getCurrentEnvironment(): ConfigEnvironment {
        return (process.env.COSMOS_ENV as ConfigEnvironment) || 'localnet';
    }
}
