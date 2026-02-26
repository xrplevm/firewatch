import { SigningStargateClient, StargateClient } from "@cosmjs/stargate";
import { IBCChain, IBCChainPair } from "./config";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { IBCEvmSignerClient } from "./client";
import { DirectSecp256k1HdWallet as EvmDirectSecp256k1HdWallet } from "./signer";
import { makeCosmoshubPath } from "@cosmjs/amino";
import { stringToPath } from "@cosmjs/crypto";

/**
 * Format the test name for IBC transfer.
 * @param chainPair The chain pair configuration.
 * @returns The formatted test name.
 */
export function formatIBCTestname(chainPair: IBCChainPair): string {
    const direction = chainPair.roundtrip ? "<->" : "->";
    return `${chainPair.srcChain.chainId} ${direction} ${chainPair.dstChain.chainId}`;
}

/**
 * Extract the packet sequence from the logs.
 * @param events The events to extract the packet sequence from.
 * @returns The packet sequence.
 */
export function extractPacketSequenceFromLogs(events: readonly any[]): string | undefined {
    const event = events.find((event) => event.type === "send_packet");
    const attr = event?.attributes.find((attr: any) => attr.key === "packet_sequence");
    return attr?.value;
}

/**
 * Verify the IBC packet acknowledgement.
 * @param client The client.
 * @param channelId The channel ID.
 * @param sequence The packet sequence.
 * @returns True if the packet was received, false otherwise.
 */
export async function verifyIbcPacketAcknowledgement(client: StargateClient, channelId: string, sequence: string) {
    const searchKey = `recv_packet.packet_sequence='${sequence}' AND recv_packet.packet_dst_channel='${channelId}'`;

    const results = await client.searchTx(searchKey);

    return results.length > 0;
}

/**
 * Load the IBC chain client and sender.
 * @param chain The chain configuration.
 * @returns The client and sender.
 */
export async function loadIbcChain(chain: IBCChain) {
    const wallet = chain.evm
        ? await EvmDirectSecp256k1HdWallet.fromMnemonic(chain.account.mnemonic, {
              prefix: chain.prefix,
              hdPaths: [stringToPath("m/44'/60'/0'/0/0")], // Ethereum derivation path
          })
        : await DirectSecp256k1HdWallet.fromMnemonic(chain.account.mnemonic, {
              prefix: chain.prefix,
              hdPaths: [makeCosmoshubPath(0)], // Standard Cosmos derivation path
          });
    const client = chain.evm
        ? await IBCEvmSignerClient.connectWithSigner(chain.rpcUrl, wallet)
        : await SigningStargateClient.connectWithSigner(chain.rpcUrl, wallet);

    const accounts = await wallet.getAccounts();
    const sender = accounts[0].address;

    return { client, sender, accounts };
}

/**
 * Calculate timeout height for IBC transfer.
 * @param client The destination chain client.
 * @param heightBuffer The number of blocks to add as buffer (default: 1000).
 * @returns The timeout height object.
 */
export async function calculateTimeoutHeight(client: StargateClient, heightBuffer: number = 1000) {
    const currentHeight = await client.getHeight();
    return {
        revisionNumber: 1,
        revisionHeight: currentHeight + heightBuffer,
    };
}

/**
 * Calculate timeout timestamp for IBC transfer.
 * @param timeoutMinutes The number of minutes from now for timeout (default: 10).
 * @returns The timeout timestamp in nanoseconds.
 */
export function calculateTimeoutTimestamp(timeoutMinutes: number = 10): bigint {
    const timeoutMs = Date.now() + timeoutMinutes * 60 * 1000;
    return BigInt(timeoutMs) * BigInt(1000000); // Convert to nanoseconds
}
