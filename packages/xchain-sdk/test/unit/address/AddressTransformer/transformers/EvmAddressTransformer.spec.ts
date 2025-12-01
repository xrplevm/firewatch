import { EvmAddressTransformer } from "../../../../../src/address/AddressTransformer";

describe("EvmAddressTransformer", () => {
    const evmAddressTransformer = EvmAddressTransformer;

    const evmAddress = "0xa12439fec30153fc797d97b9fca8b0b088b2b32c";

    test("EVM: Returns the same address", () => {
        const address = evmAddressTransformer.evm(evmAddress);

        expect(address).toEqual(evmAddress);
    });

    test("XRP: Returns the transformed XRP address", () => {
        const address = evmAddressTransformer.xrp(evmAddress);

        expect(address).toEqual("rE6sBxsgo7niMPERsRNVsF67JYGL3AxkYR");
    });
});
