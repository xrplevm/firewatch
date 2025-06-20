import { polling, PollingOptions } from "@shared/utils";
import { AxelarScanProvider, AxelarScanProviderErrors } from "@firewatch/bridge/providers/axelarscan";
import { ProviderError } from "@firewatch/bridge/providers/error";

/**
 * Polls for the execution outcome of a transaction and ensures it was executed successfully.
 * Allows "Insufficient fee" errors up to a specified number of times.
 * @param txHash The transaction hash to monitor.
 * @param axelarScanProvider The provider to fetch the transaction outcome.
 * @param pollingOptions Options for polling.
 * @param insufficientFeeRetries Number of allowed "Insufficient fee" errors (default: 5).
 * @throws An error if the transaction execution fails or encounters an Axelar error (other than allowed "Insufficient fee").
 */
export async function expectExecuted(
    txHash: string,
    axelarScanProvider: AxelarScanProvider,
    pollingOptions: PollingOptions,
    insufficientFeeRetries: number = 5,
): Promise<void> {
    let insufficientFeeCount = 0;
    let lastError: any = null;

    const lifecycle = await polling(
        async () => {
            const lifecycleInfo = await axelarScanProvider.fetchOutcome(txHash);

            if (
                lifecycleInfo &&
                lifecycleInfo.error &&
                (typeof lifecycleInfo.error.message !== "string" || lifecycleInfo.error.message !== "Insufficient fee")
            ) {
                throw new ProviderError(AxelarScanProviderErrors.TRANSACTION_EXECUTION_FAILED, { originalError: lifecycleInfo.error });
            }

            if (
                lifecycleInfo &&
                lifecycleInfo.error &&
                typeof lifecycleInfo.error.message === "string" &&
                lifecycleInfo.error.message === "Insufficient fee"
            ) {
                insufficientFeeCount++;
                lastError = lifecycleInfo.error;
            }

            return lifecycleInfo;
        },
        (res: any) => {
            if (res && res.status === "destination_executed") {
                return false;
            }

            if (insufficientFeeCount > insufficientFeeRetries) {
                return false;
            }

            return true;
        },
        pollingOptions,
    );

    if (lifecycle && lifecycle.error && typeof lifecycle.error.message) {
        throw new ProviderError(AxelarScanProviderErrors.TRANSACTION_EXECUTION_FAILED, { originalError: lastError || lifecycle.error });
    }
}

/**
 * Polls for the axelar transaction hash using fetchCallbackTransactionHash.
 * @param txHash The transaction hash to monitor.
 * @param axelarScanProvider The provider to fetch the callback.
 * @param pollingOptions Options for polling.
 * @returns The transaction hash if found, otherwise undefined.
 */
export async function getAxelarDestinationTransactionHash(
    txHash: string,
    axelarScanProvider: AxelarScanProvider,
    pollingOptions: PollingOptions,
): Promise<string | undefined> {
    const transactionHash = await polling(
        async () => {
            try {
                return await axelarScanProvider.fetchCallbackTransactionHash(txHash);
            } catch (_: unknown) {
                return undefined;
            }
        },
        (result) => !result,
        pollingOptions,
    );
    return transactionHash;
}

/**
 * Ensures execution on both source and destination chains for a given transaction.
 * @param txHash The source transaction hash.
 * @param axelarScanProvider The provider to fetch transaction outcomes.
 * @param pollingOpts Options for polling.
 * @param insufficientFeeRetries Number of allowed "Insufficient fee" errors (optional).
 * @throws An error if execution fails on either source or destination.
 */ export async function expectFullExecution(
    txHash: string,
    axelarScanProvider: AxelarScanProvider,
    pollingOpts: any,
    insufficientFeeRetries?: number,
) {
    await expectExecuted(txHash, axelarScanProvider, pollingOpts, insufficientFeeRetries);
    const destinationTxHash = await getAxelarDestinationTransactionHash(txHash, axelarScanProvider, pollingOpts);
    await expectExecuted(destinationTxHash!, axelarScanProvider, pollingOpts, insufficientFeeRetries);
}

/**
 * Polls for the execution outcome of a transaction and ensures it fails with the expected Axelar error message.
 * @param txHash The transaction hash to monitor.
 * @param axelarScanProvider The provider to fetch the transaction outcome.
 * @param expectedError The expected substring in the error message.
 * @param pollingOptions Options for polling.
 * @throws An error if the transaction does not fail with the expected error.
 */
export async function expectAxelarError(
    txHash: string,
    axelarScanProvider: AxelarScanProvider,
    expectedError: string,
    pollingOptions: PollingOptions,
): Promise<void> {
    const lifecycle = await polling(
        async () => {
            const lifecycleInfo = await axelarScanProvider.fetchOutcome(txHash);
            return lifecycleInfo;
        },
        (res: any) => !(res && res.error),
        pollingOptions,
    );

    if (!lifecycle || !lifecycle.error) {
        throw new Error(`Expected Axelar error containing '${expectedError}', but no error was found.`);
    }

    const errorMsg = typeof lifecycle.error === "string" ? lifecycle.error : lifecycle.error.message || JSON.stringify(lifecycle.error);

    if (!errorMsg.includes(expectedError)) {
        throw new Error(`Expected Axelar error to include '${expectedError}', but got: ${errorMsg}`);
    }
}

/**
 * Polls for a transaction and checks that a gas_added_transaction exists with the expected gas fee.
 * @param txHash The transaction hash to monitor.
 * @param axelarScanProvider The provider to fetch the transaction.
 * @param expectedGasFee The expected gas fee amount (as string or number).
 * @param pollingOptions Options for polling.
 * @throws Error if the expected gas fee is not found in gas_added_transactions.
 */
export async function expectGasAdded(
    txHash: string,
    axelarScanProvider: AxelarScanProvider,
    expectedGasFee: string | number,
    pollingOptions: PollingOptions,
): Promise<void> {
    const expectedFeeStr = expectedGasFee.toString();

    const result = await polling(
        async () => {
            try {
                const gasAddedTransactions = await axelarScanProvider.fetchGasAddedTransactions(txHash);

                if (!gasAddedTransactions || !Array.isArray(gasAddedTransactions)) {
                    return undefined;
                }

                return gasAddedTransactions.find(
                    (tx: any) =>
                        tx.returnValues && tx.returnValues.gasFeeAmount && tx.returnValues.gasFeeAmount.toString() === expectedFeeStr,
                );
            } catch (e) {
                return undefined;
            }
        },
        (found) => !found,
        pollingOptions,
    );

    if (!result) {
        throw new Error(`No gas_added_transaction found with gasFeeAmount = ${expectedGasFee}`);
    }
}
