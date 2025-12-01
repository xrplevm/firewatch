import { XChainTypes } from "@peersyst/xrp-evm-contracts/dist/typechain-types/contracts/BridgeDoorMultiToken";
import { BridgeChainIssueStructMock } from "./BridgeChainIssueStruct.mock";
import { mockify } from "../../utils/mockify";

export const BridgeConfigStructMock = mockify<XChainTypes.BridgeConfigStruct>({
    lockingChainDoor: "0x1",
    lockingChainIssue: new BridgeChainIssueStructMock(),
    issuingChainDoor: "0x2",
    issuingChainIssue: new BridgeChainIssueStructMock(),
});
