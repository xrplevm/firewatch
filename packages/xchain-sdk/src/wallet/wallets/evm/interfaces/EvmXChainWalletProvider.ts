import { BridgeDoorMultiToken } from "@peersyst/xrp-evm-contracts";
import { XChainTypes } from "@peersyst/xrp-evm-contracts/dist/typechain-types/contracts/BridgeDoorMultiToken";
import { XChainWalletProvider } from "../../../interfaces";
import { ChainType } from "../../../../common/types";
import { FormattedBridge } from "../../../../bridge/Bridge";
import { CreateBridgeRequestXChainWalletProvider } from "../../../interfaces";

export interface EvmXChainWalletProvider
    extends XChainWalletProvider<ChainType.EVM>,
        CreateBridgeRequestXChainWalletProvider<ChainType.EVM> {
    /**
     * Gets the token contract address for the specified bridge door.
     * @param doorAddressOrBridgeContract The bridge door address or contract.
     * @param xChainBridge The XChainBridge config.
     */
    getBridgeTokenAddress(
        doorAddressOrBridgeContract: string | BridgeDoorMultiToken,
        xChainBridge: XChainTypes.BridgeConfigStruct,
    ): Promise<string>;

    /**
     * Checks if a token contract is approved to spend tokens on behalf of an account.
     * @param address The address of the account.
     * @param bridge The bridge in EVM format.
     */
    isBridgeTokenContractApproved(address: string, bridge: FormattedBridge<ChainType.EVM>): Promise<boolean>;

    /**
     * Checks if a token address is a valid ERC20 address.
     * @param tokenAddress The token address.
     */
    isErc20Address(tokenAddress: string): Promise<boolean>;
}
