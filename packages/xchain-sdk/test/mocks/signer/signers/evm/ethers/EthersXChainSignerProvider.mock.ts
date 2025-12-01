import { EthersXChainSignerProvider } from "../../../../../../src/signer/signers/evm";
import MethodMock from "../../../../../utils/MethodMock";
import createMock from "../../../../../utils/createMock";
import { PartialXChainBridgeMock } from "../../../../xchain/PartialXChainBridge.mock";
import { BridgeDoorMultiTokenMock } from "../../../../xrp-evm-contracts/BridgeDoorMultiToken.mock";
import { BridgeTokenMock } from "../../../../xrp-evm-contracts/BridgeToken.mock";

export const EthersXChainSignerProviderMock = createMock<EthersXChainSignerProvider>({
    getBridgeContract: new MethodMock("mockResolvedValue", new BridgeDoorMultiTokenMock()),
    getBridgeTokenContract: new MethodMock("mockResolvedValue", new BridgeTokenMock()),
    getBridgeTokenDecimals: new MethodMock("mockResolvedValue", 18),
    isErc20Address: new MethodMock("mockResolvedValue", true),
    tokenBridgeExists: new MethodMock("mockResolvedValue", false),
    getMinCreateBridgeReward: new MethodMock("mockResolvedValue", "25000000000000000000"),
    findTokenBridge: new MethodMock("mockResolvedValue", new PartialXChainBridgeMock()),
});
