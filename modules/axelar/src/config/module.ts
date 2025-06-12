import { HardhatModuleConfig } from "@testing/hardhat/config";
import { Account } from "@firewatch/core/account";
import { AxelarBridgeChain, XrplChain, XrplEvmChain } from "../models/chain";
import { PollingOptions } from "@shared/utils";

export type EstimateGasFeeOptions = {
    gasLimit: number;
};

export interface AxelarModuleConfig extends Omit<HardhatModuleConfig<AxelarBridgeChain, Account>, "network" | "accounts"> {
    axelar: {
        url: string;
        apiUrl: string;
        gmpUrl: string;
        excludeTests: string[];
        axelarScanOptions: PollingOptions;
        estimateGasFee: EstimateGasFeeOptions;
    };
    xrplEvmChain: XrplEvmChain;
    xrplChain: XrplChain;
    evmChain: AxelarBridgeChain;
}
