import { XChainTypes } from "@peersyst/xrp-evm-contracts/dist/typechain-types/contracts/BridgeDoorMultiToken";
import { mockify } from "../../utils/mockify";

export const BridgeParamsStructOutputMock = mockify<XChainTypes.BridgeParamsStruct>({
    signatureReward: "1000000000000000000",
    minCreateAmount: "50000000000000000000",
});
