import { FormattedBridge } from "../../bridge/Bridge";
import { ChainType } from "../../common/types";
import { TrustClaimTransaction, Unconfirmed } from "../../transaction/types";
import { XChainWallet } from "./XChainWallet";

export interface TrustClaimXChainWallet<T extends ChainType = ChainType> extends XChainWallet<T> {
    /**
     * Checks if the claim has to be trusted.
     */
    isTrustClaimRequired(bridge: FormattedBridge<T>): boolean;

    /**
     * Trusts the claim.
     * @pre isTrustClaimRequired returns true.
     * @param bridge A bridge in `chainType` format.
     */
    trustClaim(bridge: FormattedBridge<T>): Promise<Unconfirmed<TrustClaimTransaction>>;

    /**
     * Checks if the claim is trusted.
     * @pre isTrustClaimRequired returns true.
     * @param bridge A bridge in `chainType` format.
     */
    isClaimTrusted(bridge: FormattedBridge<T>): Promise<boolean>;
}
