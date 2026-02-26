import { XChainBridgeChainMock } from "./XChainBridgeChain.mock";
import { PartialXChainBridgeChainMock } from "./PartialXChainBridgeChain.mock";
import { ChainType } from "../../../src/common/types";
import { PartialXChainBridge, XChainAddress, XChainBridgeIssue } from "../../../src/xchain";

export class PartialXChainBridgeMock<LT extends ChainType = ChainType, IT extends ChainType = ChainType> extends PartialXChainBridge<
    LT,
    IT
> {
    constructor({
        lockingChain = new XChainBridgeChainMock<LT>({
            id: "XRPL",
            type: "xrp" as LT,
            doorAddress: new XChainAddress("r123456789", ChainType.XRP) as XChainAddress<LT>,
            issue: new XChainBridgeIssue("XRP"),
            signatureReward: "1000000",
        }),
        issuingChain = new PartialXChainBridgeChainMock<IT>({
            type: "evm" as IT,
            doorAddress: new XChainAddress("0x123456789", ChainType.EVM) as XChainAddress<IT>,
            issue: new XChainBridgeIssue("XRP"),
        }),
    }: Partial<PartialXChainBridge<LT, IT>> = {}) {
        super(lockingChain, issuingChain);
    }
}
