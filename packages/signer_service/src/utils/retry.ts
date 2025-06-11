import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ChainType } from "@shared/modules/chain";
import { ISignerService } from "../interfaces";
import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";

/**
 * Attempts to acquire a signer with multiple retries if unavailable
 * @param signerService The signer service to acquire signers from
 * @param chain The blockchain type to acquire a signer for
 * @param maxRetries Maximum number of retry attempts
 * @param delayMs Delay in milliseconds between retry attempts
 * @returns A promise that resolves to an available signer
 */
export async function getSignerWithRetry<T extends EthersSigner | XrplSigner>(
    signerService: ISignerService<T>,
    chain: ChainType,
    maxRetries = 100,
    delayMs = 2000,
): Promise<T> {
    let retries = 0;
    let signer: T | null = null;

    while (!signer && retries < maxRetries) {
        signer = await signerService.acquireSigner(chain);
        if (signer) return signer;
        retries++;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error(`Failed to acquire signer after ${maxRetries} retries`);
}
