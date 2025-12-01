import { BridgeDoorPair } from "../../../../src/bridge/BridgeDoor";
import { BridgeDoorMock } from "../../../mocks/bridge/BridgeDoor/BridgeDoor.mock";

describe("BridgeDoorPair", () => {
    describe("Constructor", () => {
        test("Creates a BridgeDoorPair instance", () => {
            const bridgeDoorPair = new BridgeDoorPair(new BridgeDoorMock(), new BridgeDoorMock());

            expect(bridgeDoorPair).toBeDefined();
        });
    });
});
