import { ChainType } from "../../../src/common/types";
import { XChainAddress, XChainBridge, XChainBridgeIssue } from "../../../src/xchain";
import { XChainBridgeChainMock } from "./XChainBridgeChain.mock";

export class XChainBridgeMock<LT extends ChainType = ChainType, IT extends ChainType = ChainType> extends XChainBridge<LT, IT> {
    constructor({
        lockingChain = new XChainBridgeChainMock<LT>({
            id: "XRPL",
            type: "xrp" as LT,
            doorAddress: new XChainAddress("rK4AgC3mCNMS1cNVbgWBgyfJhCgXrceeAf", ChainType.XRP) as XChainAddress<LT>,
            issue: new XChainBridgeIssue("XRP"),
            signatureReward: "1000000",
        }),
        issuingChain = new XChainBridgeChainMock<IT>({
            id: "EVM Sidechain",
            type: "evm" as IT,
            doorAddress: new XChainAddress("0x82A219787fBD55c89438685F5D274F373d2cff9f", ChainType.EVM) as XChainAddress<IT>,
            issue: new XChainBridgeIssue("XRP"),
            signatureReward: "100000000000000000000",
        }),
    }: Partial<XChainBridge<LT, IT>> = {}) {
        super(lockingChain, issuingChain);
    }
}
