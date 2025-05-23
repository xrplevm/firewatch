import { HardhatModuleConfig } from "@testing/hardhat/config";
import { Account } from "@firewatch/core/account";
import { AxelarBridgeChain, XrplChain, XrplEvmChain } from "../models/chain";
import { PollingOptions } from "@shared/utils";

export interface AxelarModuleConfig extends Omit<HardhatModuleConfig<AxelarBridgeChain, Account>, "network" | "accounts"> {
    axelar: {
        url: string;
        apiUrl: string;
        gmpUrl: string;
        axelarScanOptions: PollingOptions;
    };
    xrplEvmChain: XrplEvmChain;
    xrplChain: XrplChain;
    evmChain: AxelarBridgeChain;
}
