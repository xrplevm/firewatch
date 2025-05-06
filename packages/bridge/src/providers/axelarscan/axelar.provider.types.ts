import { GMPStatus, GMPStatusResponse } from "@axelar-network/axelarjs-sdk";

export type LifecycleInfo = {
    status: GMPStatus | string;
    error?: GMPStatusResponse["error"];
    executed?: GMPStatusResponse["executed"];
    expressExecuted?: GMPStatusResponse["expressExecuted"];
    approved?: GMPStatusResponse["approved"];
    callback?: GMPStatusResponse["callback"];
};

/**
 * TODO: This type is currently `any` because the Axelar SDK can return different transaction receipt shapes from multiple chains.
 * Will try to improve this type when we know the possible structures better.
 */
export type AxelarCallInfo = any;
