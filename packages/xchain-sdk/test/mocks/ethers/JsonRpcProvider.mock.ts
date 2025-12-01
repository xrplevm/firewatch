import { providers } from "ethers";
import createMock from "../../utils/createMock";
import MethodMock from "../../utils/MethodMock";
import { MockData } from "../../utils/Mock";

export const JsonRpcProviderMock = createMock<providers.JsonRpcProvider>({
    getBalance: new MethodMock("mockResolvedValue", "100000000000000000000"),
} as MockData<providers.JsonRpcProvider>);
