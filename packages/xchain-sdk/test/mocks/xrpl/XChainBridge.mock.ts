import { XChainBridge } from "xrpl";
import { mockify } from "../../utils/mockify";

export const XChainBridgeMock = mockify<XChainBridge>({
    LockingChainDoor: "r1",
    LockingChainIssue: {
        currency: "XRP",
    },
    IssuingChainDoor: "r2",
    IssuingChainIssue: {
        currency: "XRP",
    },
});
