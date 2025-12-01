import { ChainType } from "../../common";
import { CreateBridgeRequestTransaction, Unconfirmed } from "../../transaction";
import { XChainTokenFormat } from "../../xchain/XChainToken";
import { XChainWallet } from "./XChainWallet";

export interface CreateBridgeRequestXChainWallet<T extends ChainType = ChainType> extends XChainWallet<T> {
    /**
     * Creates a bridge request.
     * @param doorAddress The (locking) door address.
     * @param tokenAddress The token address.
     * @param issuingDoorAddress The issuing door address in T format.
     */
    createBridgeRequest(
        doorAddress: string,
        token: XChainTokenFormat<T>,
        issuingDoorAddress: string,
    ): Promise<Unconfirmed<CreateBridgeRequestTransaction>>;
}
