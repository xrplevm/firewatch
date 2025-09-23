import { Account } from "@firewatch/core/account";
import { ModuleConfig } from "@firewatch/core/module";
import { Chain } from "@firewatch/core/chain";
import { BankModuleConfig } from "../modules/bank/config";
import { PoaModuleConfig } from "../modules/poa/config";
import { SlashingModuleConfig } from "../modules/slashing/config";
import { EvmModuleConfig as EvmModuleConfigV2 } from "../modules/evm/v2/config";
import { EvmModuleConfig as EvmModuleConfigV1 } from "../modules/evm/v1/config";
import { FeemarketModuleConfig as FeemarketModuleConfigV1 } from "../modules/feemarket/v1/config";
import { FeemarketModuleConfig as FeemarketModuleConfigV2 } from "../modules/feemarket/v2/config";

export interface CosmosModuleConfig extends Omit<ModuleConfig<Chain, Account>, "accounts" | "door"> {
    bank: BankModuleConfig;
    poa: PoaModuleConfig;
    slashing: SlashingModuleConfig;
    evm: {
        v1: EvmModuleConfigV1;
        v2: EvmModuleConfigV2;
    };
    feemarket: {
        v1: FeemarketModuleConfigV1;
        v2: FeemarketModuleConfigV2;
    };
}
