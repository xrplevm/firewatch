import { ChainType } from "../../../src/common/types";
import { XChainAddress, XChainBridgeChain, XChainBridgeIssue } from "../../../src/xchain";

export class XChainBridgeChainMock<T extends ChainType = ChainType> extends XChainBridgeChain<T> {
    constructor({
        id = "XRPL",
        type = "xrp" as T,
        doorAddress = new XChainAddress("rK4AgC3mCNMS1cNVbgWBgyfJhCgXrceeAf", ChainType.XRP) as XChainAddress<T>,
        issue = new XChainBridgeIssue<T>("XRP"),
        signatureReward = "1000000",
        minAccountCreate,
    }: Partial<XChainBridgeChain<T>> = {}) {
        super(type, doorAddress, issue, signatureReward, minAccountCreate, id);
    }
}
