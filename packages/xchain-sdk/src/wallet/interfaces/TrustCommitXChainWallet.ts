import { FormattedBridge } from "../../bridge/Bridge";
import { ChainType } from "../../common/types";
import { TrustCommitTransaction, Unconfirmed } from "../../transaction/types";
import { XChainWallet } from "./XChainWallet";

export interface TrustCommitXChainWallet<T extends ChainType = ChainType> extends XChainWallet<T> {
    /**
     * Checks if the commit has to be trusted.
     **/
    isTrustCommitRequired(bridge: FormattedBridge<T>): boolean;

    /**
     * Trusts the commit.
     * @pre isTrustCommitRequired returns true.
     * @param bridge A bridge in `chainType` format.
     */
    trustCommit(bridge: FormattedBridge<T>): Promise<Unconfirmed<TrustCommitTransaction>>;

    /**
     * Checks if the commit is trusted.
     * @pre isTrustCommitRequired returns true.
     * @param bridge A bridge in `chainType` format.
     */
    isCommitTrusted(bridge: FormattedBridge<T>): Promise<boolean>;
}
