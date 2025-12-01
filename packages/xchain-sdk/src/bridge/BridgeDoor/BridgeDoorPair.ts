import { ChainType } from "../../common";
import { BridgeDoor } from "./BridgeDoor";

export class BridgeDoorPair<MT extends ChainType = ChainType, ST extends ChainType = ChainType> {
    mainchainDoor: BridgeDoor;
    sidechainDoor: BridgeDoor;

    constructor(...args: [BridgeDoor<MT>, BridgeDoor<ST>]) {
        this.mainchainDoor = args[0];
        this.sidechainDoor = args[1];
    }
}
