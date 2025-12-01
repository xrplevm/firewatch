import { XrpXChainWalletProvider } from "../../../../../src/wallet/wallets/xrp";
import MethodMock from "../../../../utils/MethodMock";
import createMock from "../../../../utils/createMock";

export const XrpXChainWalletProviderMock = createMock<XrpXChainWalletProvider>({
    isAccountActive: new MethodMock("mockResolvedValue", true),
    getNativeBalance: new MethodMock("mockResolvedValue", "1000000"),
    accountHasTrustLine: new MethodMock("mockResolvedValue", true),
    isClaimAttested: new MethodMock("mockResolvedValue", true),
    isCreateAccountCommitAttested: new MethodMock("mockResolvedValue", true),
});
