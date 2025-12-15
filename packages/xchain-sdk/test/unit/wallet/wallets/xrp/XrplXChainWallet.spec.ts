import { XrplXChainProvider } from "../../../../../src/provider/providers/xrp";
import { XrplXChainSigner } from "../../../../../src/signer/signers/xrp";
import { XrplXChainWallet } from "../../../../../src/wallet/wallets/xrp";
import { XrplXChainProviderMock } from "../../../../mocks/provider/providers/xrp/xrpl/XrplXChainProvider.mock";
import { XrplXChainSignerMock } from "../../../../mocks/signer/signers/xrp/xrpl/XrplXChainSigner.mock";

describe("XrplXChainWallet", () => {
    describe("constructor", () => {
        test("Creates a XrplXChainWallet instance with a provider and a signer", () => {
            const providerMock = new XrplXChainProviderMock();
            const signerMock = new XrplXChainSignerMock();

            const xrplXChainWallet = new XrplXChainWallet(
                // Ts complaining about not implementing protected methods -\_(o.o)_/-
                providerMock as unknown as XrplXChainProvider,
                signerMock as unknown as XrplXChainSigner,
            );

            expect(xrplXChainWallet).toBeDefined();
        });

        test("Creates a XrplXChainWallet instance with a signer", () => {
            const providerMock = new XrplXChainProviderMock();
            const signerMock = new XrplXChainSignerMock({ provider: providerMock });

            const xrplXChainWallet = new XrplXChainWallet(
                // Ts complaining about not implementing protected methods -\_(o.o)_/-
                signerMock as unknown as XrplXChainSigner<XrplXChainProvider>,
            );

            expect(xrplXChainWallet).toBeDefined();
        });
    });
});
