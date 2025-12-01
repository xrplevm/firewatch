import { ChainType } from "../../../../src";
import { CreateBridgeRequestXChainWallet } from "../../../../src/wallet/interfaces";
import MethodMock from "../../../utils/MethodMock";
import { MockData } from "../../../utils/Mock";
import createMock from "../../../utils/createMock";
import { CreateBridgeRequestTransactionMock } from "../../transaction/CreateBridgeRequestTransaction.mock";

export const CreateBridgeRequestXChainWalletMock = createMock<CreateBridgeRequestXChainWallet>({
    type: ChainType.EVM,
    createBridgeRequest: new MethodMock("mockResolvedValue", new CreateBridgeRequestTransactionMock()),
} as MockData<CreateBridgeRequestXChainWallet>);
