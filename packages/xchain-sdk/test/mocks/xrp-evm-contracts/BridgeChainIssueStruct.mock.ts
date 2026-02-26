import { XChainTypes } from "@peersyst/xrp-evm-contracts/dist/typechain-types/contracts/BridgeDoorMultiToken";
import { constants } from "ethers";
import { mockify } from "../../utils/mockify";

export const BridgeChainIssueStructMock = mockify<XChainTypes.BridgeChainIssueStruct>({
    currency: "XRP",
    issuer: constants.AddressZero,
});
