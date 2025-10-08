import { Params } from "@firewatch/proto-evm";

export type AccountCode = {
    address: string;
    code: string;
};

export type EvmModuleConfig = {
    params: Params;
    code: AccountCode[];
};
