import { Signer } from "ethers";
import createMock from "../../utils/createMock";
import MethodMock from "../../utils/MethodMock";
import { MockData } from "../../utils/Mock";

export const SignerMock = createMock<Signer>({
    getAddress: new MethodMock("mockResolvedValue", "0x1"),
} as MockData<Signer>);
