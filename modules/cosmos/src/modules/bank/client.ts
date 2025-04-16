import { StargateClient } from "@cosmjs/stargate";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";

export class BankClient extends StargateClient {
    /**
     * Retrieves all balances for the specified account.
     * @param accountAddress The account address.
     * @returns A promise that resolves to an immutable array of Coin objects.
     */
    async getAllBalances(accountAddress: string): Promise<readonly Coin[]> {
        return this.getAllBalances(accountAddress);
    }
}
