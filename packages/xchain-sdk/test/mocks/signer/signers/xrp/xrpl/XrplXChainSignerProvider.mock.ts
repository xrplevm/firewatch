import { XrplXChainSignerProvider } from "../../../../../../src/signer/signers/xrp";
import MethodMock from "../../../../../utils/MethodMock";
import createMock from "../../../../../utils/createMock";
import { XrplSubmitTransactionResponseMock } from "../../../../xrpl/XrplSubmitTransactionResponse.mock";
import { XrplTxResponseResultMock } from "../../../../xrpl/XrplTxResponseResult.mock";

export const XrplXChainSignerProviderMock = createMock<XrplXChainSignerProvider>({
    awaitTransaction: new MethodMock("mockResolvedValue", new XrplTxResponseResultMock()),
    autofill: new MethodMock("mockImplementation", (tx) => tx),
    submit: new MethodMock("mockResolvedValue", new XrplSubmitTransactionResponseMock()),
});
