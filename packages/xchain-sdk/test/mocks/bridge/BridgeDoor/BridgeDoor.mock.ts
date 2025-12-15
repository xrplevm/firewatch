import { ChainType } from "../../../../src/common/types";
import { BridgeDoor } from "../../../../src/bridge/BridgeDoor";
import createMock from "../../../utils/createMock";
import { PartialXChainBridgeMock } from "../../xchain/PartialXChainBridge.mock";
import MethodMock from "../../../utils/MethodMock";

export const BridgeDoorMock = createMock<BridgeDoor>({
    type: ChainType.XRP,
    address: "r1",
    getXChainBridges: new MethodMock("mockResolvedValue", [new PartialXChainBridgeMock()]),
});
