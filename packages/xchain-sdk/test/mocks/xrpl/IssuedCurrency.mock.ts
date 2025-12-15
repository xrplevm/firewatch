import { IssuedCurrency } from "xrpl";
import { mockify } from "../../utils/mockify";

export const IssuedCurrencyMock = mockify<IssuedCurrency>({
    currency: "USD",
    issuer: "r33",
});
