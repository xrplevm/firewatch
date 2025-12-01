import { Balance } from "xrpl";
import { mockify } from "../../utils/mockify";

export const BalanceMock = mockify<Balance>({
    value: "100",
    currency: "XRP",
});
