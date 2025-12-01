import { FormattedBridge } from "../../bridge/Bridge";
import { ClaimId } from "../../bridge/utils";
import { ChainType } from "../../common/types";

export interface XChainWalletProvider<T extends ChainType> {
    /**
     * Checks if an account is active
     * @param address The address of the account
     */
    isAccountActive(address: string): Promise<boolean>;

    /**
     * Gets the native balance of an address as a string integer.
     */
    getNativeBalance(address: string): Promise<string>;

    /**
     * Checks if a claim is attested. That is the T account received the funds.
     * @param address The address of the destination account.
     * @param claimId A previously created and valid claim ID of the claim to check.
     * @param bridge The bridge in T format
     */
    isClaimAttested(address: string, claimId: ClaimId, bridge: FormattedBridge<T>): Promise<boolean>;

    /**
     * Checks if a create account is attested.
     * @param address The address of the destination account.
     */
    isCreateAccountCommitAttested(address: string): Promise<boolean>;
}
