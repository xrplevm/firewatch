import { StargateClient } from "@cosmjs/stargate";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";

export class BankClient extends StargateClient {
    async getAllBalances(accountAddress: string): Promise<readonly Coin[]> {
        return this.getAllBalances(accountAddress);
    }
}
