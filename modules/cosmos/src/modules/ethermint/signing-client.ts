import { Account, HttpEndpoint, SigningStargateClientOptions, defaultRegistryTypes } from "@cosmjs/stargate";
import { OfflineSigner, Registry } from "@cosmjs/proto-signing";
import { CometClient, connectComet } from "@cosmjs/tendermint-rpc";
import { createEthermintAccountParser, ethermintAccountParser } from "./account-parser";
import { SigningStargateClient } from "./signing-stargate-client";

/**
 * Create Ethermint-compatible registry with correct public key types.
 * @returns Registry configured for Ethermint chains.
 */
function createEthermintRegistry(): Registry {
    const registry = new Registry(defaultRegistryTypes);

    // Register Ethermint-specific amino types
    registry.register("/ethermint.crypto.v1.ethsecp256k1.PubKey", {} as any);
    registry.register("/ethermint.types.v1.EthAccount", {} as any);

    return registry;
}

type EthermintClientCtor<T extends EthermintSigningClient> = new (
    cometClient: CometClient,
    signer: OfflineSigner,
    options: SigningStargateClientOptions,
) => T;

/**
 * Ethermint-aware signing client. Uses ethermint pubkey/account types and
 * unwraps EthAccount on account queries.
 */
export class EthermintSigningClient extends SigningStargateClient {
    /**
     * Widens the parent's protected constructor to public so subclasses can be
     * instantiated via `new this(...)` from the static factories below.
     * @param cometClient The comet client.
     * @param signer The signer.
     * @param options The client options.
     */
    constructor(cometClient: CometClient, signer: OfflineSigner, options: SigningStargateClientOptions) {
        super(cometClient, signer, options);
    }

    /**
     * Get the account.
     * @param searchAddress The address to search for.
     * @returns The account, or null if not found.
     */
    async getAccount(searchAddress: string): Promise<Account | null> {
        try {
            const accountAny = await this.forceGetQueryClient().auth.account(searchAddress);
            if (!accountAny) {
                return null;
            }
            return ethermintAccountParser(accountAny);
        } catch (error) {
            console.error("Failed to get account:", error);
            return null;
        }
    }

    /**
     * Run a raw ABCI query against the connected chain.
     * @param path The ABCI query path (e.g. "/cosmos.gov.v1.Query/Proposal").
     * @param data The encoded request bytes.
     * @returns The raw response value bytes.
     */
    async queryAbci(path: string, data: Uint8Array): Promise<Uint8Array> {
        const { value } = await this.forceGetQueryClient().queryAbci(path, data);
        return value;
    }

    /**
     * Create a client with a signer.
     * @param cometClient The comet client.
     * @param signer The signer.
     * @param options The options.
     * @returns The client.
     */
    static async createWithSigner<T extends EthermintSigningClient>(
        this: EthermintClientCtor<T>,
        cometClient: CometClient,
        signer: OfflineSigner,
        options?: SigningStargateClientOptions,
    ): Promise<T> {
        const defaultOptions: SigningStargateClientOptions = {
            accountParser: createEthermintAccountParser(),
            registry: createEthermintRegistry(),
            aminoTypes: undefined,
            ...options,
        };
        return new this(cometClient, signer, defaultOptions);
    }

    /**
     * Connect with a signer.
     * @param endpoint The endpoint.
     * @param signer The signer.
     * @param options The options.
     * @returns The client.
     */
    static async connectWithSigner<T extends EthermintSigningClient>(
        this: EthermintClientCtor<T>,
        endpoint: string | HttpEndpoint,
        signer: OfflineSigner,
        options?: SigningStargateClientOptions,
    ): Promise<T> {
        const cometClient = await connectComet(endpoint);
        return EthermintSigningClient.createWithSigner.call(this, cometClient, signer, options) as Promise<T>;
    }
}
