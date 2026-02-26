import { EvmXChainWalletProvider } from "../../../../../src/wallet/wallets/evm";
import MethodMock from "../../../../utils/MethodMock";
import createMock from "../../../../utils/createMock";

export const EvmXChainWalletProviderMock = createMock<EvmXChainWalletProvider>({
    isAccountActive: new MethodMock("mockResolvedValue", true),
    getNativeBalance: new MethodMock("mockResolvedValue", "1000000000000000000"),
    getBridgeTokenAddress: new MethodMock("mockResolvedValue", "0x335"),
    isBridgeTokenContractApproved: new MethodMock("mockResolvedValue", true),
    isClaimAttested: new MethodMock("mockResolvedValue", true),
    isCreateAccountCommitAttested: new MethodMock("mockResolvedValue", true),
    isErc20Address: new MethodMock("mockReturnValue", true),
});
