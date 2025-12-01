import { AddressValidators } from "../../address/AddressValidator";
import { ChainType } from "../../common/types";
import { PartialXChainBridge } from "../../xchain";
import { BridgeDoorError, BridgeDoorErrors } from "./BridgeDoor.errors";

export abstract class BridgeDoor<T extends ChainType = ChainType> {
    /**
     * The bridge door chain type.
     */
    type: T;
    /**
     * The bridge door address.
     */
    address: string;
    /**
     * An optional id to identify the bridge door chain.
     */
    id?: string;

    constructor(type: T, address: string, id?: string) {
        this.type = type;
        this.address = address;
        this.id = id;

        if (!AddressValidators[this.type](this.address))
            throw new BridgeDoorError(BridgeDoorErrors.INVALID_DOOR_ADDRESS, { type: this.type, address: this.address });
    }

    abstract getXChainBridges(): Promise<PartialXChainBridge[]>;
}
