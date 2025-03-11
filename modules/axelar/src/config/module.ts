import { HardhatModuleConfig } from "@testing/hardhat/config";
import { Account } from "@firewatch/core/account";
import { AxelarBridgeChain } from "../models/chain";

export type AxelarCallOptions = {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
};

export interface AxelarModuleConfig extends HardhatModuleConfig<AxelarBridgeChain, Account> {
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
