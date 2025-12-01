import { XrplXChainSigner } from "../../../../../../src/signer/signers/xrp";
import MethodMock from "../../../../../utils/MethodMock";
import createMock from "../../../../../utils/createMock";
import { CommitTransactionMock } from "../../../../transaction/CommitTransaction.mock";
import { CreateAccountCommitTransactionMock } from "../../../../transaction/CreateAccountCommitTransaction.mock";
import { CreateClaimTransactionMock } from "../../../../transaction/CreateClaimTransaction.mock";
import { TrustClaimTransactionMock } from "../../../../transaction/TrustClaimTransaction.mock";
import { XrplXChainSignerProviderMock } from "./XrplXChainSignerProvider.mock";

export const XrplXChainSignerMock = createMock<XrplXChainSigner>({
    provider: new XrplXChainSignerProviderMock(),
    getAddress: new MethodMock("mockResolvedValue", "r123"),
    setTrustLine: new MethodMock("mockResolvedValue", new TrustClaimTransactionMock()),
    createClaim: new MethodMock("mockResolvedValue", new CreateClaimTransactionMock()),
    commit: new MethodMock("mockResolvedValue", new CommitTransactionMock()),
    createAccountCommit: new MethodMock("mockResolvedValue", new CreateAccountCommitTransactionMock()),
});
