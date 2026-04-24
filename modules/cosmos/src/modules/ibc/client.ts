import { DeliverTxResponse, StdFee } from "@cosmjs/stargate";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { Height } from "cosmjs-types/ibc/core/client/v1/client";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";
import { EthermintSigningClient } from "../ethermint/signing-client";

export class IBCEvmSignerClient extends EthermintSigningClient {
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
}
