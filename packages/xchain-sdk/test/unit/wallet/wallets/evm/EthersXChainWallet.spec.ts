import { EthersXChainProvider } from "../../../../../src/provider/providers/evm";
import { EthersXChainSigner } from "../../../../../src/signer/signers/evm";
import { EthersXChainWallet } from "../../../../../src/wallet/wallets/evm";
import { EthersXChainProviderMock } from "../../../../mocks/provider/providers/evm/ethers/EthersXChainProvider.mock";
import { EthersXChainSignerMock } from "../../../../mocks/signer/signers/evm/ethers/EthersXChainSigner.mock";

describe("EthersXChainWallet", () => {
    describe("constructor", () => {
        test("Creates an EthersXChainWallet instance with a provider and a signer", () => {
            const providerMock = new EthersXChainProviderMock();
            const signerMock = new EthersXChainSignerMock();

            // Ts complaining about not implementing protected methods -\_(o.o)_/-
            const ethersXChainWallet = new EthersXChainWallet(
                providerMock as unknown as EthersXChainProvider,
                signerMock as unknown as EthersXChainSigner,
            );

            expect(ethersXChainWallet).toBeDefined();
        });

        test("Creates an EthersXChainWallet instance with a signer", () => {
            const providerMock = new EthersXChainProviderMock();
            const signerMock = new EthersXChainSignerMock({ provider: providerMock });

            // Ts complaining about not implementing protected methods -\_(o.o)_/-
            const ethersXChainWallet = new EthersXChainWallet(signerMock as unknown as EthersXChainSigner<EthersXChainProvider>);

            expect(ethersXChainWallet).toBeDefined();
        });
    });
});
