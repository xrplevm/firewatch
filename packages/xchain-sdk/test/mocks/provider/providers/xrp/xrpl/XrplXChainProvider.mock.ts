import { XrplXChainProvider } from "../../../../../../src/provider/providers/xrp";
import MethodMock from "../../../../../utils/MethodMock";
import createMock from "../../../../../utils/createMock";
import { PartialXChainBridgeMock } from "../../../../xchain/PartialXChainBridge.mock";
import { ClientMock } from "../../../../xrpl/Client.mock";
import { XChainOwnedClaimIDMock } from "../../../../xrpl/XChainOwnedClaimID.mock";
import { XrplSubmitTransactionResponseMock } from "../../../../xrpl/XrplSubmitTransactionResponse.mock";
import { XrplTxResponseResultMock } from "../../../../xrpl/XrplTxResponseResult.mock";

export const XrplXChainProviderMock = createMock<XrplXChainProvider>({
    xrplClient: new ClientMock(),
    autofill: new MethodMock("mockImplementation", (tx) => tx),
    submit: new MethodMock("mockResolvedValue", new XrplSubmitTransactionResponseMock()),
    getTransaction: new MethodMock("mockResolvedValue", new XrplTxResponseResultMock()),
    isTransactionValidated: new MethodMock("mockResolvedValue", true),
    isAccountActive: new MethodMock("mockResolvedValue", true),
    getNativeBalance: new MethodMock("mockResolvedValue", "1000000"),
    getAccountClaims: new MethodMock("mockResolvedValue", [new XChainOwnedClaimIDMock()]),
    awaitTransaction: new MethodMock("mockResolvedValue", new XrplTxResponseResultMock()),
    accountHasTrustLine: new MethodMock("mockResolvedValue", true),
    isClaimAttested: new MethodMock("mockResolvedValue", true),
    isCreateAccountCommitAttested: new MethodMock("mockResolvedValue", true),
    getXChainBridges: new MethodMock("mockResolvedValue", [new PartialXChainBridgeMock()]),
});
