import { BridgeDoorMultiToken, BridgeToken } from "@peersyst/xrp-evm-contracts";
import { XChainTypes } from "@peersyst/xrp-evm-contracts/dist/typechain-types/contracts/BridgeDoorMultiToken";
import { Signer, providers } from "ethers";
import { EthersTransactionParserProvider } from "../../../../../transaction/parsers/evm/ethers";
import { EvmXChainSignerProvider } from "../../interfaces";

export interface EthersXChainSignerProvider extends EvmXChainSignerProvider, EthersTransactionParserProvider {
    /**
     * Gets the bridge contract.
     * @param doorAddress The bridge door address.
     * @param signerOrProvider An optional signer or provider to connect the contract to.
     */
    getBridgeContract(doorAddress: string, signerOrProvider?: Signer | providers.Provider): Promise<BridgeDoorMultiToken>;

    /**
     * Gets the token contract for the specified bridge door.
     * @param doorAddressOrBridgeContract The bridge door address or contract.
     * @param xChainBridge The XChainBridge config.
     * @param signerOrProvider An optional signer or provider to connect the contract to.
     */
    getBridgeTokenContract(
        doorAddressOrBridgeContract: string | BridgeDoorMultiToken,
        xChainBridge: XChainTypes.BridgeConfigStruct,
        signerOrProvider?: Signer | providers.Provider,
    ): Promise<BridgeToken>;

    /**
     * Gets the bridge token decimals.
     * @param doorAddressOrBridgeContract The bridge door address or contract.
     * @param xChainBridge The XChainBridge config.
     */
    getBridgeTokenDecimals(
        doorAddressOrBridgeContract: string | BridgeDoorMultiToken,
        xChainBridge: XChainTypes.BridgeConfigStruct,
    ): Promise<number>;
}
