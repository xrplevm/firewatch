import { IAddressValidators } from "./AddressValidator.types";
import { EvmAddressValidator, XrpAddressValidator } from "./validators";

/**
 * Collection of address validators.
 * @usage `AddressValidators[chain](address)`
 * @example `AddressValidators[ChainType.XRP]("r...")` OR `AddressValidators.xrp("r...")` validates an XRP address.
 */
export const AddressValidators: IAddressValidators = {
    xrp: XrpAddressValidator,
    evm: EvmAddressValidator,
};

export * from "./validators";

export * from "./AddressValidator.types";
