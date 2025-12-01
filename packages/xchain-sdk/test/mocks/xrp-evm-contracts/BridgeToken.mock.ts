import { BridgeToken } from "@peersyst/xrp-evm-contracts";
import { ethers } from "ethers";
import { ContractTransactionMock } from "../ethers/ContractTransaction.mock";
import createMock from "../../utils/createMock";
import MethodMock from "../../utils/MethodMock";
import { MockData } from "../../utils/Mock";

export const BridgeTokenMock = createMock<BridgeToken>({
    address: "0x123",
    allowance: new MethodMock("mockResolvedValue", ethers.constants.MaxUint256),
    approve: new MethodMock("mockResolvedValue", new ContractTransactionMock()),
    decimals: new MethodMock("mockResolvedValue", 18),
    symbol: new MethodMock("mockResolvedValue", "XRP"),
    totalSupply: new MethodMock("mockResolvedValue", "1000000000000000000000000000"),
    balanceOf: new MethodMock("mockResolvedValue", "1000000000000000000000000000"),
} as MockData<BridgeToken>);
