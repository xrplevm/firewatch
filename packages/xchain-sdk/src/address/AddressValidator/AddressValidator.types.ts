import { ChainType } from "../../common/types";

export type IAddressValidator = (address: string) => boolean;

export type IAddressValidators = Record<ChainType, IAddressValidator>;
