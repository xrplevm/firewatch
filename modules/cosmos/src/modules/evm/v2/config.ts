import { Params } from "@firewatch/proto-evm/evm";

export type AccountCode = {
    address: string;
    code: string;
    codeHash: string;
};

export type EvmModuleConfig = {
    params: Params;
    accounts: AccountCode[];
};
