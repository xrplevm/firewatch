import { XChainWalletMockData } from "./XChainWallet.mock";
import { TrustClaimTransactionMock } from "../transaction/TrustClaimTransaction.mock";
import createMock from "../../utils/createMock";
import { TrustClaimXChainWallet } from "../../../src/wallet/interfaces";
import MethodMock from "../../utils/MethodMock";

export const TrustClaimXChainWalletMock = createMock<TrustClaimXChainWallet>({
    ...XChainWalletMockData,
    isTrustClaimRequired: new MethodMock("mockReturnValue", true),
    trustClaim: new MethodMock("mockResolvedValue", new TrustClaimTransactionMock()),
    isClaimTrusted: new MethodMock("mockResolvedValue", true),
});
