import { ChainType } from "../../../../common";
import { CreateBridgeRequestXChainSignerProvider } from "../../../interfaces";

export interface EvmXChainSignerProvider<T extends ChainType = ChainType> extends CreateBridgeRequestXChainSignerProvider<T> {
    /**
     * Checks if a token address is a valid ERC20 address.
     * @param tokenAddress The token address.
     */
    isErc20Address(tokenAddress: string): Promise<boolean>;
}
