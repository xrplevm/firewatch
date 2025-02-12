import { Account } from "@firewatch/core/account";
import { Chain } from "@firewatch/core/chain";

export interface AxelarBridgeChain extends Chain {
    axelarAmplifierGatewayAddress: string;
    interchainTokenServiceAddress: string;
    account: Pick<Account, "privateKey">;
}
