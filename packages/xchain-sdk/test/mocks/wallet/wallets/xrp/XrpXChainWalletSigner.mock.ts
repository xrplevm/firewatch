import { XrpXChainWalletSigner } from "../../../../../src/wallet/wallets/xrp";
import MethodMock from "../../../../utils/MethodMock";
import createMock from "../../../../utils/createMock";
import { CommitTransactionMock } from "../../../transaction/CommitTransaction.mock";
import { CreateAccountCommitTransactionMock } from "../../../transaction/CreateAccountCommitTransaction.mock";
import { CreateClaimTransactionMock } from "../../../transaction/CreateClaimTransaction.mock";
import { TrustClaimTransactionMock } from "../../../transaction/TrustClaimTransaction.mock";

export const XrpXChainWalletSignerMock = createMock<XrpXChainWalletSigner>({
    getAddress: new MethodMock("mockResolvedValue", "0x123"),
    setTrustLine: new MethodMock("mockResolvedValue", new TrustClaimTransactionMock()),
    createClaim: new MethodMock("mockResolvedValue", new CreateClaimTransactionMock()),
    commit: new MethodMock("mockResolvedValue", new CommitTransactionMock()),
    createAccountCommit: new MethodMock("mockResolvedValue", new CreateAccountCommitTransactionMock()),
});
