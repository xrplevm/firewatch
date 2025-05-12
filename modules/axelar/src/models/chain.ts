import { Account } from "@firewatch/core/account";
import { Chain } from "@firewatch/core/chain";
import { PollingOptions } from "@shared/utils";

export type InterchainTransferOptions = {
    amount: string;
    gasLimit?: string;
    gasValue?: string;
};

export interface AxelarBridgeChain extends Chain {
    axelarAmplifierGatewayAddress: string;
    interchainTokenServiceAddress: string;
    interchainTransferOptions: InterchainTransferOptions;
    pollingOptions: PollingOptions;
    account: Pick<Account, "privateKey">;
}
