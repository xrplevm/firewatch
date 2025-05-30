import { HardhatModuleConfig } from "@testing/hardhat/config";
import { Account } from "@firewatch/core/account";
import { AxelarBridgeChain } from "../models/chain";
import { PollingOptions } from "@shared/utils";

export interface AxelarModuleConfig extends Omit<HardhatModuleConfig<AxelarBridgeChain, Account>, "network" | "accounts"> {
    axelar: {
        url: string;
        apiUrl: string;
        gmpUrl: string;
        axelarScanOptions: PollingOptions;
    };
    xrplEvmChain: AxelarBridgeChain;
    xrplChain: AxelarBridgeChain;
    evmChain: AxelarBridgeChain;
}
