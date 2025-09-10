import { Params } from "@firewatch/proto-evmos";

export type AccountCode = {
    address: string;
    code: string;
};

export type EvmModuleConfig = {
    params: Params;
    code: AccountCode[];
};
