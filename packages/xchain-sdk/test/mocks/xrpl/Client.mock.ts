import { Client } from "xrpl";
import { SubmitResponseMock } from "./SubmitResponse.mock";
import createMock from "../../utils/createMock";
import MethodMock from "../../utils/MethodMock";
import { MockData } from "../../utils/Mock";

export const ClientMock = createMock<Client>({
    request: new MethodMock("mockResolvedValue"),
    getXrpBalance: new MethodMock("mockResolvedValue", "50000000"),
    connect: new MethodMock("mockResolvedValue"),
    disconnect: new MethodMock("mockResolvedValue"),
    autofill: new MethodMock("mockImplementation", (tx: any) => tx),
    submit: new MethodMock("mockResolvedValue", new SubmitResponseMock()),
} as MockData<Client>);
