import { XrpAddressTransformer } from "../../../../../src/address/AddressTransformer";

describe("XrpAddressTransformer", () => {
    const xrpAddressTransformer = XrpAddressTransformer;

    const xrpAddress = "rE6sBxsgo7niMPERsRNVsF67JYGL3AxkYR";

    test("XRP: Returns the same address", () => {
        const address = xrpAddressTransformer.xrp(xrpAddress);

        expect(address).toEqual(xrpAddress);
    });

    test("EVM: Returns the transformed EVM address", () => {
        const address = xrpAddressTransformer.evm(xrpAddress);

        expect(address).toEqual("0xa12439fec30153fc797d97b9fca8b0b088b2b32c");
    });
});
