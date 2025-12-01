import { CommitTransaction } from "../../../src/transaction/types";
import { TransactionMock } from "./Transaction.mock";

export class CommitTransactionMock extends TransactionMock implements CommitTransaction {}
