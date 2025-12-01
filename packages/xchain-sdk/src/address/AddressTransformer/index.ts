import { IAddressTransformers } from "./AddressTransformer.types";
import { EvmAddressTransformer, XrpAddressTransformer } from "./transformers";

/**
 * Collection of address transformers.
 * @usage `AddressTransformers[chain][format](address)`
 * @example `AddressTransformers[ChainType.XRP][ChainType.EVM]("r...")` OR `AddressTransformers.xrp.evm("r...")` transforms an XRP address to an EVM address.
 */
export const AddressTransformers: IAddressTransformers = {
    xrp: XrpAddressTransformer,
    evm: EvmAddressTransformer,
};

export * from "./transformers";

export * from "./AddressTransformer.types";
