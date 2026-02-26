import { Params } from "@firewatch/proto-evmos/feemarket";

export type FeemarketModuleConfig = {
    params: Params;
    baseFee: string;
};
