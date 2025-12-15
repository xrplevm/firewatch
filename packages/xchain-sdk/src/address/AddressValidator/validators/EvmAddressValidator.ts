import { isAddress } from "ethers/lib/utils";
import { IAddressValidator } from "../AddressValidator.types";

export const EvmAddressValidator: IAddressValidator = (address: string): boolean => {
    return isAddress(address);
};
