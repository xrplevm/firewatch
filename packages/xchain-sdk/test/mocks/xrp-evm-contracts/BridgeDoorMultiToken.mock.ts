import { BridgeDoorMultiToken } from "@peersyst/xrp-evm-contracts";
import { BridgeConfigStructMock } from "./BridgeConfigStruct.mock";
import { ContractTransactionMock } from "../ethers/ContractTransaction.mock";
import { BridgeParamsStructOutputMock } from "./BridgeParamsStructOutput.mock";
import createMock from "../../utils/createMock";
import MethodMock from "../../utils/MethodMock";
import { MockData } from "../../utils/Mock";

export const BridgeDoorMultiTokenMock = createMock<BridgeDoorMultiToken>({
    createClaimId: new MethodMock("mockResolvedValue", new ContractTransactionMock()),
    commit: new MethodMock("mockResolvedValue", new ContractTransactionMock()),
    createAccountCommit: new MethodMock("mockResolvedValue", new ContractTransactionMock()),
    createBridgeRequest: new MethodMock("mockResolvedValue", new ContractTransactionMock()),
    filters: {
        Credit: jest.fn(),
    } as unknown as BridgeDoorMultiToken["filters"],
    getBridgeKey: new MethodMock("mockResolvedValue", "mockBridgeKey"),
    getBridgeToken: new MethodMock("mockResolvedValue", "mockBridgeToken"),
    getBridgesPaginated: new MethodMock("mockResolvedValue", {
        configs: [new BridgeConfigStructMock()],
        params: [new BridgeParamsStructOutputMock()],
    }),
} as MockData<BridgeDoorMultiToken>);
