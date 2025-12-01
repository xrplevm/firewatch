import { ChainType } from "../../../src";
import { XChainWallet } from "../../../src/wallet/interfaces";
import MethodMock from "../../utils/MethodMock";
import { MockData } from "../../utils/Mock";
import createMock from "../../utils/createMock";
import { CommitTransactionMock } from "../transaction/CommitTransaction.mock";
import { CreateAccountCommitTransactionMock } from "../transaction/CreateAccountCommitTransaction.mock";
import { CreateClaimTransactionMock } from "../transaction/CreateClaimTransaction.mock";

export const XChainWalletMockData: MockData<XChainWallet> = {
    type: ChainType.XRP,
    getAddress: new MethodMock("mockResolvedValue", "1234567890"),
    isActive: new MethodMock("mockResolvedValue", true),
    getBalance: new MethodMock("mockResolvedValue", "1000000000"),
    createClaim: new MethodMock("mockResolvedValue", new CreateClaimTransactionMock()),
    commit: new MethodMock("mockResolvedValue", new CommitTransactionMock()),
    createAccountCommit: new MethodMock("mockResolvedValue", new CreateAccountCommitTransactionMock()),
    isClaimAttested: new MethodMock("mockResolvedValue", true),
    isCreateAccountCommitAttested: new MethodMock("mockResolvedValue", true),
};

export const XChainWalletMock = createMock<XChainWallet>(XChainWalletMockData);
