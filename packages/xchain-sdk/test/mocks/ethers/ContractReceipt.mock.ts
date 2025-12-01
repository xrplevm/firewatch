import { ContractReceipt } from "ethers";
import { mockify } from "../../utils/mockify";

export const ContractReceiptMock = mockify<ContractReceipt>({
    events: [],
});
