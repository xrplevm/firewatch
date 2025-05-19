import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { AccountTxTransaction, TransactionMetadata } from "xrpl";
import { polling, PollingOptions } from "@shared/utils";

/**
 * Polls until observing a transaction from `sender` to `destination`
 * with the specified error code in XRPL.
 * @param xrplProvider The XrplProvider instance to use for XRPL interactions
 * @param sender The sender address
 * @param destination The destination address
 * @param error The expected error code (e.g. "tecNO_DST_INSUF_XRP")
 * @param pollingOpts Options for polling
 * @returns The failed transaction
 * @throws Error if no matching failed transaction is found within polling parameters
 */
export async function expectXrplFailedDestination(
    xrplProvider: XrplProvider,
    sender: string,
    destination: string,
    error: string = "tec",
    pollingOpts: PollingOptions,
): Promise<void> {
    const failedTx = (await polling(
        async () => {
            const txs = await xrplProvider.getAccountTransactions(sender);

            const failed = txs.find(({ tx, meta }) => {
                if (!tx || !meta) return false;

                if (tx.TransactionType === "Payment" && tx.Destination === destination) {
                    const result = (meta as TransactionMetadata).TransactionResult;
                    return typeof result === "string" && result.includes(error);
                }
                return false;
            });
            return failed || null;
        },
        (res) => res === null,
        pollingOpts,
    )) as AccountTxTransaction;

    if (!failedTx) {
        throw new Error(
            `No matching failed transaction with error '${error}' found from ${sender} to ${destination} within polling timeframe`,
        );
    }
}
