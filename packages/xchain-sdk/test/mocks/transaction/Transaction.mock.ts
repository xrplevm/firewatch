import { Confirmed, Transaction, Unconfirmed } from "../../../src/transaction/types";

export class TransactionMock implements Transaction {
    hash: string;
    confirmed: boolean;

    constructor({ hash = "1234", confirmed = false }: Partial<Transaction> = {}) {
        this.hash = hash;
        this.confirmed = confirmed;
    }

    asUnconfirmed(): Unconfirmed<this> {
        return {
            ...this,
            confirmed: false,
            wait: jest.fn(() => new Promise((resolve) => resolve((this as any).asConfirmed()))),
        };
    }

    asConfirmed(): Confirmed<Omit<this, "asConfirmed" | "asUnconfirmed">> {
        return {
            ...this,
            confirmed: true,
        };
    }
}
