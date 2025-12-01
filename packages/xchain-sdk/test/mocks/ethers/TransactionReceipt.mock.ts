import { providers } from "ethers";
import { mockify } from "../../utils/mockify";

export const TransactionReceiptMock = mockify<providers.TransactionReceipt>({
    transactionHash: "1234",
});
