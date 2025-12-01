import { Wallet } from "xrpl";
import createMock from "../../utils/createMock";
import MethodMock from "../../utils/MethodMock";
import { MockData } from "../../utils/Mock";

export const WalletMock = createMock<Wallet>({
    address: "address",
    sign: new MethodMock("mockImplementation", (tx) => ({ tx_blob: JSON.stringify(tx), hash: "123456" })),
} as MockData<Wallet>);
