import { ChainType } from "../../common/types";

export type IAddressTransformer = Record<ChainType, (address: string) => string>;

export type IAddressTransformers = Record<ChainType, IAddressTransformer>;
