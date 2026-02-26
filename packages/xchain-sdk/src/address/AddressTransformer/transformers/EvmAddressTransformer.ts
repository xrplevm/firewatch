import { encodeAccountID } from "ripple-address-codec";
import { IAddressTransformer } from "../AddressTransformer.types";

export const EvmAddressTransformer: IAddressTransformer = {
    evm(address) {
        return address;
    },

    xrp(address) {
        const accountId = Buffer.from(address.slice(2), "hex");
        return encodeAccountID(accountId);
    },
};
