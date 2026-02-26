import { Bridge } from "xrpl/dist/npm/models/ledger";
import { XChainBridgeMock } from "./XChainBridge.mock";
import { mockify } from "../../utils/mockify";

export const BridgeMock = mockify<Bridge>({
    LedgerEntryType: "Bridge",
    Account: "rA",
    SignatureReward: "1000000",
    XChainBridge: new XChainBridgeMock(),
    XChainAccountCreateCount: "50000000",
});
