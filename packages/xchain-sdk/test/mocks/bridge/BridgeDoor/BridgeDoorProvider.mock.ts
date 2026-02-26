import { BridgeDoorProvider } from "../../../../src";
import MethodMock from "../../../utils/MethodMock";
import createMock from "../../../utils/createMock";
import { PartialXChainBridgeMock } from "../../xchain/PartialXChainBridge.mock";

export const BridgeDoorProviderMock = createMock<BridgeDoorProvider>({
    getXChainBridges: new MethodMock("mockResolvedValue", [new PartialXChainBridgeMock()]),
});
