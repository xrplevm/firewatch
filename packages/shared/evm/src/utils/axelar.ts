import { polling, PollingOptions } from "@shared/utils";
import { AxelarScanProvider, AxelarScanProviderErrors } from "@firewatch/bridge/providers/axelarscan";
import { ProviderError } from "@firewatch/bridge/providers/error";

/**
 * Polls for the execution outcome of a transaction and ensures it was executed successfully.
 * @param txHash The transaction hash to monitor.
 * @param axelarScanProvider The provider to fetch the transaction outcome.
 * @param pollingOptions Options for polling.
 * @throws An error if the transaction execution fails or encounters an Axelar error.
 */
export async function expectExecuted(
    txHash: string,
    axelarScanProvider: AxelarScanProvider,
    pollingOptions: PollingOptions,
): Promise<void> {
    const lifecycle = await polling(
        async () => {
            const lifecycleInfo = await axelarScanProvider.fetchOutcome(txHash);
            console.log("Lifecycle Info:", lifecycleInfo.status);
            return lifecycleInfo;
        },
        (res: any) => !(res && (res.status === "destination_executed" || res.error)),
        pollingOptions,
    );

    if (lifecycle && lifecycle.error) {
        throw new ProviderError(AxelarScanProviderErrors.TRANSACTION_EXECUTION_FAILED, { originalError: lifecycle.error });
    }
}

/**
 * Polls for the execution outcome of a transaction and ensures it fails with the expected Axelar error message.
 * @param txHash The transaction hash to monitor.
 * @param axelarScanProvider The provider to fetch the transaction outcome.
 * @param expectedError The expected in the error message.
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
            console.log("Lifecycle Info:", lifecycleInfo.status, lifecycleInfo.error);
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
