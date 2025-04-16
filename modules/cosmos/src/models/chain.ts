import { Account } from "@firewatch/core/account";
import { Chain } from "@firewatch/core/chain";
import { CosmosModule } from "../models/module";

export interface CosmosChain extends Chain {
    module: CosmosModule;
    account: Pick<Account, "name">;
}
