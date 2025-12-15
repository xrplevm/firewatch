import { Confirmed, CreateBridgeRequestTransaction, PartialXChainBridge } from "../../../src";
import { PartialXChainBridgeMock } from "../xchain/PartialXChainBridge.mock";
import { TransactionMock } from "./Transaction.mock";

export class CreateBridgeRequestTransactionMock extends TransactionMock implements CreateBridgeRequestTransaction {
    async waitCreation(): Promise<PartialXChainBridge> {
        return new PartialXChainBridgeMock();
    }

    // Override this method to make waitCreation callable
    asConfirmed(): Confirmed<Omit<this, "asConfirmed" | "asUnconfirmed">> {
        return {
            ...this,
            confirmed: true,
            waitCreation: jest.fn(() => Promise.resolve(() => (this as any).waitCreation())),
        };
    }
}
