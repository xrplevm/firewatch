import { FormattedBridge } from "../../bridge/Bridge";
import { ClaimId } from "../../bridge/utils";
import { ChainType } from "../../common/types";
import { CommitTransaction, CreateAccountCommitTransaction, CreateClaimTransaction, Unconfirmed } from "../../transaction/types";

export interface XChainWallet<T extends ChainType = ChainType> {
    /**
     * The chain type of the wallet.
     */
    type: T;

    /**
     * Gets the address of the wallet.
     */
    getAddress(): Promise<string>;

    /**
     * Checks if the wallet account is active.
     */
    isActive(): Promise<boolean>;

    /**
     * Gets the native balance of the wallet as a string integer.
     */
    getBalance(): Promise<string>;

    /**
     * Creates a claim.
     * @param originAddress Address of the origin account in `chainType` format.
     * @param bridge A bridge in `chainType` format.
     */
    createClaim(originAddress: string, bridge: FormattedBridge<T>): Promise<Unconfirmed<CreateClaimTransaction>>;

    /**
     * Commits the claim.
     * @param claimId Claim ID of the transfer.
     * @param destinationAddress Address of the destination account in `chainType` format.
     * @param bridge A bridge in `chainType` format.
     * @param amount The amount to commit (with decimals).
     */
    commit(
        claimId: ClaimId,
        destinationAddress: string,
        bridge: FormattedBridge<T>,
        amount: string,
    ): Promise<Unconfirmed<CommitTransaction>>;

    /**
     * Activates an account and transfers the specified amount to it.
     * @param destinationAddress Address of the destination account in `chainType` format.
     * @param bridge A bridge in `chainType` format.
     * @param amount The amount to transfer (with decimals).
     **/
    createAccountCommit(
        destinationAddress: string,
        bridge: FormattedBridge<T>,
        amount: string,
    ): Promise<Unconfirmed<CreateAccountCommitTransaction>>;

    /**
     * Checks if a claim is attested.
     * @pre This is the destination wallet. Claim attestations are checked on the destination chain.
     * @param claimId A previously created and valid claim ID of the claim to check.
     * @param bridge A bridge in `chainType` format.
     */
    isClaimAttested(claimId: ClaimId, bridge: FormattedBridge<T>): Promise<boolean>;

    /**
     * Checks if a create account is attested.
     * @pre This is the destination wallet. Create account attestations are checked on the destination chain.
     * @param bridge A bridge in `chainType` format.
     */
    isCreateAccountCommitAttested(bridge: FormattedBridge<T>): Promise<boolean>;
}
