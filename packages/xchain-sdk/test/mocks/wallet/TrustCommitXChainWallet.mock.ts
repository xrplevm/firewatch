import { XChainWalletMockData } from "./XChainWallet.mock";

import { TrustCommitTransactionMock } from "../transaction/TrustCommitTransaction.mock";
import createMock from "../../utils/createMock";
import { TrustCommitXChainWallet } from "../../../src/wallet/interfaces";
import MethodMock from "../../utils/MethodMock";

export const TrustCommitXChainWalletMock = createMock<TrustCommitXChainWallet>({
    ...XChainWalletMockData,
    isTrustCommitRequired: new MethodMock("mockReturnValue", true),
    trustCommit: new MethodMock("mockResolvedValue", new TrustCommitTransactionMock()),
    isCommitTrusted: new MethodMock("mockResolvedValue", true),
});
