import { Environment as SdkEnv } from "@axelar-network/axelarjs-sdk";
import { Env } from "@firewatch/env/types";
import { ProviderError } from "../../core/error/provider.error";
import { AxelarProviderErrors } from "../axelar.provider.errors";

export function toSdkEnv(env: Env): SdkEnv {
    switch (env) {
        case "mainnet":
            return SdkEnv.MAINNET;
        case "testnet":
            return SdkEnv.TESTNET;
        case "devnet":
            return SdkEnv.DEVNET;
        case "localnet":
            throw new ProviderError(AxelarProviderErrors.LOCALNET_NOT_SUPPORTED);
        default:
            throw new ProviderError(AxelarProviderErrors.UNKNOWN_ENVIRONMENT);
    }
}
