import { XrpAddressValidator } from "../../../../../src/address/AddressValidator";

describe("XrpAddressValidator", () => {
    const xrpAddressValidator = XrpAddressValidator;

    test("Returns true when address is valid", () => {
        const isValid = xrpAddressValidator("rE6sBxsgo7niMPERsRNVsF67JYGL3AxkYR");

        expect(isValid).toEqual(true);
    });

    test("Returns false when address is invalid", () => {
        const isValid = xrpAddressValidator("rImAnInvalidAddress");

        expect(isValid).toEqual(false);
    });
});
