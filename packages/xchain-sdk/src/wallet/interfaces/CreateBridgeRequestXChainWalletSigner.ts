import { ChainType } from "../../common";
import { CreateBridgeRequestTransaction, Unconfirmed } from "../../transaction";
import { XChainTokenFormat } from "../../xchain/XChainToken";
import { XChainWalletSigner } from "./XChainWalletSigner";

export interface CreateBridgeRequestXChainWalletSigner<T extends ChainType = ChainType> extends XChainWalletSigner<T> {
    /**
     * Creates a bridge request.
     * @pre The value needs to satisfy the createBridgeReward amount.
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
