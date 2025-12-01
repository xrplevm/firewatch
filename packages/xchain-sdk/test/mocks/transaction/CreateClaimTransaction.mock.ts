import { ClaimId } from "../../../src/bridge/utils";
import { CreateClaimTransaction } from "../../../src/transaction/types";
import { TransactionMock } from "./Transaction.mock";

export class CreateClaimTransactionMock extends TransactionMock implements CreateClaimTransaction {
    claimId: ClaimId;

    constructor({ claimId = new ClaimId("0x1234"), ...rest }: Partial<CreateClaimTransaction> = {}) {
        super(rest);
        this.claimId = claimId;
    }
}
