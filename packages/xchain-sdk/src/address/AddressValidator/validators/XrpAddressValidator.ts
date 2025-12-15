import { isValidAddress } from "xrpl";
import { IAddressValidator } from "../AddressValidator.types";

export const XrpAddressValidator: IAddressValidator = (address: string): boolean => {
    return isValidAddress(address);
};
