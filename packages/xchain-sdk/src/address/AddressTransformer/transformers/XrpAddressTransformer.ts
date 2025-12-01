import { decodeAccountID } from "ripple-address-codec";
import { IAddressTransformer } from "../AddressTransformer.types";

export const XrpAddressTransformer: IAddressTransformer = {
    xrp(address) {
        return address;
    },

    evm(address) {
        const accountId = decodeAccountID(address);
        return `0x${Buffer.from(accountId).toString("hex")}`;
    },
};
