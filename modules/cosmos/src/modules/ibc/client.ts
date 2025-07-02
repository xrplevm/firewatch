import {
    DeliverTxResponse,
    StdFee,
    SignerData,
    HttpEndpoint,
    SigningStargateClientOptions,
    accountFromAny,
    Account,
    defaultRegistryTypes,
} from "@cosmjs/stargate";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { Height } from "cosmjs-types/ibc/core/client/v1/client";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";
import { EncodeObject, OfflineSigner, Registry } from "@cosmjs/proto-signing";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { CometClient, connectComet } from "@cosmjs/tendermint-rpc";
import { parseEthAccount } from "./parser";
import { SigningStargateClient } from "./signingstartgateclient";
import { Any } from "cosmjs-types/google/protobuf/any";

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

/**
 * Custom account parser that extends accountFromAny to support EthAccount.
 * @param input The Any message containing the account.
 * @returns The parsed account.
 * @throws Error if parsing fails.
 */
export function ethermintAccountParser(input: Any): Account {
    try {
        // First try standard Cosmos account parsing for non-EthAccount types
        if (input.typeUrl !== "/ethermint.types.v1.EthAccount") {
            return accountFromAny(input);
        }

        // Handle EthAccount specifically
        const ethAccount = parseEthAccount(input);
        if (ethAccount?.baseAccount) {
            return {
                address: ethAccount.baseAccount.address,
                accountNumber: Number(ethAccount.baseAccount.accountNumber),
                sequence: Number(ethAccount.baseAccount.sequence),
                pubkey: null, // EthAccount doesn't store pubkey in the account
            } as Account;
        }

        // If EthAccount parsing fails, try fallback to standard parsing
        return accountFromAny(input);
    } catch (error) {
        console.error("Failed to parse account:", error);
        // Final fallback to standard parsing, let it throw if it fails
        return accountFromAny(input);
    }
}

/**
 * Create an account parser configured for a specific address prefix.
 * @returns A configured account parser function.
 */
export function createEthermintAccountParser() {
    return (input: Any): Account => ethermintAccountParser(input);
}

export class IBCEvmSignerClient extends SigningStargateClient {
    constructor(cometClient: CometClient, signer: OfflineSigner, options: SigningStargateClientOptions) {
        super(cometClient, signer, options);
    }

    /**
     * Get the account.
     * @param searchAddress The address to search for.
     * @returns The account.
     */
    async getAccount(searchAddress: string): Promise<Account | null> {
        try {
            const accountAny = await this.forceGetQueryClient().auth.account(searchAddress);

            if (!accountAny) {
                return null;
            }

            // Use the custom account parser
            return ethermintAccountParser(accountAny);
        } catch (error) {
            console.error("Failed to get account:", error);
            return null;
        }
    }

    /**
     * Create a client with a signer.
     * @param cometClient The comet client.
     * @param signer The signer.
     * @param options The options.
     * @returns The client.
     */
    static async createWithSigner(
        cometClient: CometClient,
        signer: OfflineSigner,
        options?: SigningStargateClientOptions,
    ): Promise<IBCEvmSignerClient> {
        const defaultOptions: SigningStargateClientOptions = {
            accountParser: createEthermintAccountParser(), // Use our custom account parser
            registry: createEthermintRegistry(),
            aminoTypes: undefined, // Use default amino types
            ...options,
        };
        return new IBCEvmSignerClient(cometClient, signer, defaultOptions);
    }

    /**
     * Connect with a signer.
     * @param endpoint The endpoint.
     * @param signer The signer.
     * @param options The options.
     * @returns The client.
     */
    static async connectWithSigner(
        endpoint: string | HttpEndpoint,
        signer: OfflineSigner,
        options?: SigningStargateClientOptions,
    ): Promise<IBCEvmSignerClient> {
        const cometClient = await connectComet(endpoint);
        return await IBCEvmSignerClient.createWithSigner(cometClient, signer, options);
    }

    /**
     * Send IBC tokens from one chain to another.
     * @param senderAddress The address of the sender.
     * @param recipientAddress The address of the recipient.
     * @param transferAmount The amount of tokens to transfer.
     * @param sourcePort The source port.
     * @param sourceChannel The source channel.
     * @param timeoutHeight The timeout height.
     * @param timeoutTimestamp The timeout timestamp (in milliseconds if number, or nanoseconds if bigint).
     * @param fee The fee.
     * @param memo The memo.
     * @returns The deliver tx response.
     */
    async sendIbcTokens(
        senderAddress: string,
        recipientAddress: string,
        transferAmount: Coin,
        sourcePort: string,
        sourceChannel: string,
        timeoutHeight: Height | undefined,
        timeoutTimestamp: number | bigint | undefined,
        fee: StdFee,
        memo?: string,
    ): Promise<DeliverTxResponse> {
        let timeoutTimestampNanos: bigint | undefined;

        if (timeoutTimestamp !== undefined) {
            if (typeof timeoutTimestamp === "bigint") {
                // Already in nanoseconds (from calculateTimeoutTimestamp utility)
                timeoutTimestampNanos = timeoutTimestamp;
            } else {
                // Convert from milliseconds to nanoseconds
                timeoutTimestampNanos = BigInt(timeoutTimestamp) * BigInt(1000000);
            }
        }

        const transferMsg = {
            typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
            value: MsgTransfer.fromPartial({
                sourcePort: sourcePort,
                sourceChannel: sourceChannel,
                sender: senderAddress,
                receiver: recipientAddress,
                token: transferAmount,
                timeoutHeight: timeoutHeight,
                timeoutTimestamp: timeoutTimestampNanos,
            }),
        };

        return this.signAndBroadcast(senderAddress, [transferMsg], fee, memo);
    }

    /**
     * Sign and broadcast a transaction.
     * @param signerAddress The address of the signer.
     * @param messages The messages to sign and broadcast.
     * @param fee The fee.
     * @param memo The memo.
     * @param timeoutHeight The timeout height.
     * @returns The deliver tx response.
     */
    async signAndBroadcast(
        signerAddress: string,
        messages: readonly EncodeObject[],
        fee: StdFee,
        memo: string = "",
        timeoutHeight?: bigint,
    ): Promise<DeliverTxResponse> {
        const txRaw = await this.sign(signerAddress, messages, fee, memo, undefined, timeoutHeight);
        const txBytes = TxRaw.encode(txRaw).finish();
        return this.broadcastTx(txBytes, this.broadcastTimeoutMs, this.broadcastPollIntervalMs);
    }

    /**
     * Sign a transaction.
     * @param signerAddress The address of the signer.
     * @param messages The messages to sign.
     * @param fee The fee.
     * @param memo The memo.
     * @param explicitSignerData Explicit signer data.
     * @param timeoutHeight The timeout height.
     * @returns The signed transaction.
     */
    async sign(
        signerAddress: string,
        messages: readonly EncodeObject[],
        fee: StdFee,
        memo: string,
        explicitSignerData?: SignerData,
        timeoutHeight?: bigint,
    ): Promise<TxRaw> {
        return super.sign(signerAddress, messages, fee, memo, explicitSignerData as any, timeoutHeight);
    }
}
