import { ethers } from "ethers";
import {
    ImplementedTransactionResponse,
    TransactionResponseMock,
    TransactionResponseMockConstructorParams,
} from "./TransactionResponse.mock";
import { ContractReceiptMock } from "./ContractReceipt.mock";

type ImplementedContractTransactionMock = ImplementedTransactionResponse<ethers.ContractTransaction>;

export class ContractTransactionMock
    extends TransactionResponseMock<ethers.ContractTransaction>
    implements ImplementedContractTransactionMock
{
    constructor({
        receipt = new ContractReceiptMock(),
        ...rest
    }: TransactionResponseMockConstructorParams<ethers.ContractTransaction> = {}) {
        super({ receipt, ...rest });
    }
}
