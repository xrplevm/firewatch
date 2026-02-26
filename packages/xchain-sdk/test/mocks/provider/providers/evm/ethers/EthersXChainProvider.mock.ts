import { EthersXChainProvider } from "../../../../../../src/provider/providers/evm";
import MethodMock from "../../../../../utils/MethodMock";
import createMock from "../../../../../utils/createMock";
import { BridgeDoorMultiTokenMock } from "../../../../xrp-evm-contracts/BridgeDoorMultiToken.mock";
import { BridgeTokenMock } from "../../../../xrp-evm-contracts/BridgeToken.mock";
import { PartialXChainBridgeMock } from "../../../../xchain/PartialXChainBridge.mock";
import { ProviderMock } from "../../../../ethers/Provider.mock";

export const EthersXChainProviderMock = createMock<EthersXChainProvider>({
    ethersProvider: new ProviderMock(),
    getNativeBalance: new MethodMock("mockResolvedValue", "1000000000000000000"),
    getNonce: new MethodMock("mockResolvedValue", 1),
    isAccountActive: new MethodMock("mockResolvedValue", true),
    getBridgeContract: new MethodMock("mockResolvedValue", new BridgeDoorMultiTokenMock()),
    getBridgeTokenAddress: new MethodMock("mockResolvedValue", "0x335"),
    getBridgeTokenContract: new MethodMock("mockResolvedValue", new BridgeTokenMock()),
    getBridgeTokenDecimals: new MethodMock("mockResolvedValue", 18),
    isBridgeTokenContractApproved: new MethodMock("mockResolvedValue", true),
    isClaimAttested: new MethodMock("mockResolvedValue", true),
    isCreateAccountCommitAttested: new MethodMock("mockResolvedValue", true),
    getXChainBridges: new MethodMock("mockResolvedValue", [new PartialXChainBridgeMock()]),
    isErc20Address: new MethodMock("mockResolvedValue", true),
    tokenBridgeExists: new MethodMock("mockResolvedValue", true),
    getMinCreateBridgeReward: new MethodMock("mockResolvedValue", "25000000000000000000"),
    findTokenBridge: new MethodMock("mockResolvedValue", new PartialXChainBridgeMock()),
});
