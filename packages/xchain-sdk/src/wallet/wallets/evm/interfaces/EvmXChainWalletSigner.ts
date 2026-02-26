import { FormattedBridge } from "../../../../bridge/Bridge";
import { ChainType } from "../../../../common/types";
import { TrustCommitTransaction, Unconfirmed } from "../../../../transaction";
import { CreateBridgeRequestXChainWalletSigner } from "../../../interfaces";

export interface EvmXChainWalletSigner extends CreateBridgeRequestXChainWalletSigner<ChainType.EVM> {
    /**
     * Approves a token contract to spend tokens on behalf of an account.
     * @param bridge The bridge config in EVM format.
     * @pre The bridge has a token origin issue.
     */
    approveBridgeTokenContract(bridge: FormattedBridge<ChainType.EVM>): Promise<Unconfirmed<TrustCommitTransaction>>;
}
