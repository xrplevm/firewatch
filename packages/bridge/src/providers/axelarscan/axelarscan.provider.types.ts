import { GasPaidInfo, GMPError, GMPStatus, GMPStatusResponse, EvmChain } from "@axelar-network/axelarjs-sdk";

export type LifecycleInfo = {
    status: GMPStatus | string;
    error?: GMPError;
};

export type AxelarMetrics = {
    timeSpent?: GMPStatusResponse["timeSpent"];
    gasPaidInfo?: GasPaidInfo;
};

export type AxelarCallInfo = {
    callTx?: GMPStatusResponse["callTx"];
    approved?: GMPStatusResponse["approved"];
    expressExecuted?: GMPStatusResponse["expressExecuted"];
    executed?: GMPStatusResponse["executed"];
    callback?: GMPStatusResponse["callback"];
};

export type ExtendedEvmChain = EvmChain | "xrpl-evm";
