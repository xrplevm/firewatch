import { Account } from "@firewatch/core/account";
import { Chain } from "@firewatch/core/chain";
import { Token } from "@firewatch/core/token";
import { PollingOptions } from "@shared/utils";

export type InterchainTransferOptions = {
    amount: string;
    gasLimit?: string;
    gasValue?: string;
    gasFeeAmount?: string;
};

export interface AxelarBridgeChain extends Chain {
    axelarAmplifierGatewayAddress: string;
    interchainTokenServiceAddress: string;
    interchainTransferOptions: InterchainTransferOptions;
    pollingOptions: PollingOptions;
    accounts: Array<Omit<Account, "name">>;
}

export interface XrplEvmChain extends AxelarBridgeChain {
    erc20: Token;
}

export interface XrplChain extends AxelarBridgeChain {
    iou: Token;
}
