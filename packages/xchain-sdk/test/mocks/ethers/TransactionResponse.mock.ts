import { providers } from "ethers";
import { TransactionReceiptMock } from "./TransactionReceipt.mock";

export type ImplementedTransactionResponse<T extends providers.TransactionResponse> = Pick<T, "hash" | "wait">;

export type TransactionResponseMockConstructorParams<T extends providers.TransactionResponse> = Partial<
    Omit<ImplementedTransactionResponse<T>, "wait"> & { receipt: Partial<Awaited<ReturnType<T["wait"]>>> }
>;

export class TransactionResponseMock<T extends providers.TransactionResponse> implements ImplementedTransactionResponse<T> {
    hash: T["hash"];
    wait: T["wait"];

    constructor({ hash = "1234", receipt = new TransactionReceiptMock() as any }: TransactionResponseMockConstructorParams<T> = {}) {
        this.hash = hash;
        this.wait = () => Promise.resolve(receipt as any);
    }
}
