import { TransactionReceipt, TransactionResponse, ContractTransactionResponse } from "ethers";
import { Unconfirmed, Transaction } from "@shared/modules/blockchain";
import { HardhatErrors } from "../constants";
import { polling, PollingOptions } from "@shared/utils";
import { AxelarScanProvider, AxelarScanProviderErrors } from "@firewatch/bridge/providers/axelarscan";
import { ProviderError } from "@firewatch/bridge/providers/error";

type TxPromise = Promise<Unconfirmed<Transaction>> | Promise<ContractTransactionResponse>;

/**
 * Asserts a transaction reverts with the expected error message.
 * @param tx The transaction promise expected to revert.
 * @param expectedError The expected error message in the revert reason.
 * @throws An error if the transaction does not revert or the message does not match.
 */
export async function expectRevert(tx: TxPromise, expectedError: string): Promise<void> {
    try {
        const txResponse = await tx;
        await txResponse.wait();
        throw new Error(`Expected transaction to revert with '${expectedError}', but it did not.`);
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (!errMsg.includes(expectedError)) {
            throw new Error(`Expected error message to include '${expectedError}', but got: ${errMsg}`);
        }
    }
}

/**
 * Executes a transaction, waits for its confirmation, and calculates the gas cost.
 * @param txPromise A promise that resolves to a transaction response.
 * @returns An object containing the receipt and the gas cost (as a bigint).
 */
export async function executeTx(txPromise: Promise<TransactionResponse>): Promise<{ receipt: TransactionReceipt; gasCost: bigint }> {
    const tx = await txPromise;
    const receipt = await tx.wait();

    if (!receipt) {
        throw new Error(HardhatErrors.TRANSACTION_NOT_MINED);
    }

    const gasCost = receipt.gasUsed * receipt.gasPrice;
    return { receipt, gasCost };
}

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
            return lifecycleInfo;
        },
        (res: any) => !(res && (res.status === "destination_executed" || res.error)),
        pollingOptions,
    );

    if (lifecycle && lifecycle.error) {
        throw new ProviderError(AxelarScanProviderErrors.TRANSACTION_EXECUTION_FAILED, { originalError: lifecycle.error });
    }
}
