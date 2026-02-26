import { EvmAddressValidator } from "../../../../../src/address/AddressValidator";

describe("EvmAddressValidator", () => {
    const evmAddressValidator = EvmAddressValidator;

    test("Returns true when address is valid", () => {
        const isValid = evmAddressValidator("0xa12439fec30153fc797d97b9fca8b0b088b2b32c");

        expect(isValid).toEqual(true);
    });

    test("Returns false when address is invalid", () => {
        const isValid = evmAddressValidator("0xImAnInvalidAddress");

        expect(isValid).toEqual(false);
    });
});
