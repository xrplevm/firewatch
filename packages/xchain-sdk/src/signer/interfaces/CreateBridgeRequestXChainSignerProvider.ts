import { ChainType } from "../../common";
import { XChainTokenFormat } from "../../xchain/XChainToken";

export interface CreateBridgeRequestXChainSignerProvider<T extends ChainType = ChainType> {
    /**
     * Checks if a token address exists in a bridge.
     * @param doorAddress The (locking) door address of the bridge.
     * @param token The token.
     * @param issuingDoorAddress The issuing door address.
     */
    tokenBridgeExists(doorAddress: string, token: XChainTokenFormat<T>, issuingDoorAddress: string): Promise<boolean>;

    /**
     * Gets the minimum reward for creating a bridge in a bridge contract.
     * @param doorAddress The door address.
     */
    getMinCreateBridgeReward(doorAddress: string): Promise<string>;
}
