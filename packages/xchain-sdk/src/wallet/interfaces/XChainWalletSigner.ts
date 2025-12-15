import { FormattedBridge } from "../../bridge/Bridge";
import { ClaimId } from "../../bridge/utils";
import { ChainType } from "../../common/types";
import { CommitTransaction, CreateAccountCommitTransaction, CreateClaimTransaction, Unconfirmed } from "../../transaction/types";

export interface XChainWalletSigner<T extends ChainType> {
    /**
     * Gets the address of the signer.
     */
    getAddress(): Promise<string>;

    /**
     * Creates a claim.
     * @param originAddress The origin address in T format.
     * @param bridge The bridge in T format.
     */
    createClaim(originAddress: string, bridge: FormattedBridge<T>): Promise<Unconfirmed<CreateClaimTransaction>>;

    /**
     * Commits a commit.
     * @param claimId The claim id.
     * @param destinationAddress The destination address in T format.
     * @param bridge The bridge in T format.
     * @param amount The amount to commit (with decimals).
     */
    commit(
        claimId: ClaimId,
        destinationAddress: string,
        bridge: FormattedBridge<T>,
        amount: string,
    ): Promise<Unconfirmed<CommitTransaction>>;

    /**
     * Creates a create account commit.
     * @param destinationAddress The destination address in T format.
     * @param bridgeConfig The bridge in T format.
     * @param amount The amount to commit (with decimals).
     * @pre The bridge has a native destination issue.
     */
    createAccountCommit(
        destinationAddress: string,
        bridge: FormattedBridge<T>,
        amount: string,
    ): Promise<Unconfirmed<CreateAccountCommitTransaction>>;
}
