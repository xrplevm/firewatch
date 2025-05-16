import { Environment as SdkEnv } from "@axelar-network/axelarjs-sdk";
import { Env } from "@firewatch/env/types";
import { ProviderError } from "../../core/error/provider.error";
import { AxelarScanProviderErrors } from "../axelarscan.provider.errors";

export function toSdkEnv(env: Env): SdkEnv {
    switch (env) {
        case "mainnet":
            return SdkEnv.MAINNET;
        case "testnet":
            return SdkEnv.TESTNET;
        case "devnet":
            return SdkEnv.DEVNET;
        case "localnet":
            throw new ProviderError(AxelarScanProviderErrors.LOCALNET_NOT_SUPPORTED);
        default:
            throw new ProviderError(AxelarScanProviderErrors.UNKNOWN_ENVIRONMENT);
    }
}
