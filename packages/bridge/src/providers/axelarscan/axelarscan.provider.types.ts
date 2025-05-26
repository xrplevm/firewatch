import { GMPError, GMPStatus, EvmChain } from "@axelar-network/axelarjs-sdk";

export type LifecycleInfo = {
    status: GMPStatus | string;
    error?: GMPError;
};

export type ExtendedEvmChain = EvmChain | "xrpl-evm";
