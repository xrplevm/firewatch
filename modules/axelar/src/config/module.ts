import { HardhatModuleConfig } from "@testing/hardhat/config";
import { Account } from "@firewatch/core/account";
import { AxelarBridgeChain } from "../models/chain";

export type AxelarCallOptions = {
    amount: string;
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
};

export interface AxelarModuleConfig extends Omit<HardhatModuleConfig<AxelarBridgeChain, Account>, "network" | "accounts"> {
    axelar: {
        url: string;
        apiUrl: string;
        gmpUrl: string;
        sourceChain: AxelarBridgeChain;
        destinationChain: AxelarBridgeChain;
        interchainTransferOptions: AxelarCallOptions;
        gmpOptions: AxelarCallOptions;
    };
}
