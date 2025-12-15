import { ChainType } from "../../../src/common/types";
import { PartialXChainBridgeChain, XChainAddress, XChainBridgeIssue } from "../../../src/xchain";

export class PartialXChainBridgeChainMock<T extends ChainType = ChainType> extends PartialXChainBridgeChain<T> {
    constructor({
        type = ChainType.XRP as T,
        doorAddress = new XChainAddress("r123456789", ChainType.XRP) as XChainAddress<T>,
        issue = new XChainBridgeIssue("XRP"),
    }: Partial<PartialXChainBridgeChain<T>> = {}) {
        super(type, doorAddress, issue);
    }
}
