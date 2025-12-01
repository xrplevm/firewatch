import { EnhancedError, EnhancedErrorArgs } from "../../common/utils/error";

export enum BridgeDoorErrors {
    INVALID_DOOR_ADDRESS = "Invalid {{type}} door address {{address}}.",
}

export class BridgeDoorError<E extends BridgeDoorErrors> extends EnhancedError<E> {
    constructor(...args: EnhancedErrorArgs<E>) {
        super(...args);
        this.name = "BridgeDoorError";
    }
}
