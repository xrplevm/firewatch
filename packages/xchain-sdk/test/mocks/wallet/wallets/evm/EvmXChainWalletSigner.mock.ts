import { EvmXChainWalletSigner } from "../../../../../src/wallet/wallets/evm";
import MethodMock from "../../../../utils/MethodMock";
import createMock from "../../../../utils/createMock";
import { CommitTransactionMock } from "../../../transaction/CommitTransaction.mock";
import { CreateAccountCommitTransactionMock } from "../../../transaction/CreateAccountCommitTransaction.mock";
import { CreateBridgeRequestTransactionMock } from "../../../transaction/CreateBridgeRequestTransaction.mock";
import { CreateClaimTransactionMock } from "../../../transaction/CreateClaimTransaction.mock";
import { TrustCommitTransactionMock } from "../../../transaction/TrustCommitTransaction.mock";

export const EvmXChainWalletSignerMock = createMock<EvmXChainWalletSigner>({
    getAddress: new MethodMock("mockResolvedValue", "0x123"),
    approveBridgeTokenContract: new MethodMock("mockResolvedValue", new TrustCommitTransactionMock()),
    createClaim: new MethodMock("mockResolvedValue", new CreateClaimTransactionMock()),
    commit: new MethodMock("mockResolvedValue", new CommitTransactionMock()),
    createAccountCommit: new MethodMock("mockResolvedValue", new CreateAccountCommitTransactionMock()),
    createBridgeRequest: new MethodMock("mockResolvedValue", new CreateBridgeRequestTransactionMock()),
});
