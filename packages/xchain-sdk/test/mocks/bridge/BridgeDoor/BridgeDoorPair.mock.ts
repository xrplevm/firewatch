import { BridgeDoorPair } from "../../../../src/bridge";
import { ChainType } from "../../../../src/common/types";
import { mockify } from "../../../utils/mockify";
import { BridgeDoorMock } from "./BridgeDoor.mock";

export const BridgeDoorPairMock = mockify<BridgeDoorPair>({
    mainchainDoor: new BridgeDoorMock({
        type: ChainType.XRP,
        address: "r1",
    }),
    sidechainDoor: new BridgeDoorMock({
        type: ChainType.EVM,
        address: "0x1",
    }),
});
