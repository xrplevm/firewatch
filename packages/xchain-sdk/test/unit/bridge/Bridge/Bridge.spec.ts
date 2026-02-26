import { Bridge } from "../../../../src/bridge/Bridge";
import { BridgeDirection, BridgeSide, BridgeSource } from "../../../../src/common/types";
import { XChainBridgeMock } from "../../../mocks/xchain/XChainBridge.mock";

describe("Bride", () => {
    let bridge: Bridge;

    const direction = BridgeDirection.LOCKING_TO_ISSUING;
    const xChainBridge = new XChainBridgeMock();

    beforeEach(() => {
        bridge = new Bridge(direction, xChainBridge);
    });

    describe("swapped", () => {
        test("Swaps the bridge", () => {
            const swappedBridge = bridge.swapped();

            expect(swappedBridge.direction).toEqual(BridgeDirection.ISSUING_TO_LOCKING);
        });
    });

    // Tests forDestination and forOrigin
    describe("forSource", () => {
        test("For destination", () => {
            const destinationBridge = bridge.forSource(BridgeSource.DESTINATION);

            expect(destinationBridge.format).toEqual(xChainBridge.issuingChain.type);
        });

        test("For origin", () => {
            const destinationBridge = bridge.forSource(BridgeSource.ORIGIN);

            expect(destinationBridge.format).toEqual(xChainBridge.lockingChain.type);
        });
    });

    // Tests forLocking and forIssuing
    describe("forSide", () => {
        test("For locking", () => {
            const destinationBridge = bridge.forSide(BridgeSide.LOCKING);

            expect(destinationBridge.format).toEqual(xChainBridge.lockingChain.type);
        });

        test("For issuing", () => {
            const destinationBridge = bridge.forSide(BridgeSide.ISSUING);

            expect(destinationBridge.format).toEqual(xChainBridge.issuingChain.type);
        });
    });
});
