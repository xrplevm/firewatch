import { ethers, providers } from "ethers";
import createMock from "../../utils/createMock";
import MethodMock from "../../utils/MethodMock";
import { MockData } from "../../utils/Mock";

export const ProviderMock = createMock<providers.Provider>({
    getBalance: new MethodMock("mockResolvedValue", ethers.BigNumber.from("1000000000000000000")),
    getTransactionCount: new MethodMock("mockResolvedValue", 0),
} as MockData<providers.Provider>);
