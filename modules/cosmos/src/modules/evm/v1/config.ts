import { Params } from "@firewatch/proto-evmos/evm";

export type AccountCode = {
    address: string;
    code: string | null;
    codeHash: string;
};

export type EvmModuleConfig = {
    params: Params;
    accounts: AccountCode[];
};
