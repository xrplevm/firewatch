import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { AbiCoder, BigNumberish, ethers } from "ethers";
import config from "../../../module.config.example.json";
import { polling, PollingOptions } from "@shared/utils";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { Token } from "@firewatch/core/token";
import { CallContract } from "@shared/evm/contracts";
import { expectMessageUpdate, expectEventEmission } from "../evm-evm/call-contract.helpers";
import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { ChainType } from "@shared/modules/chain";

describe("CallContract XRP - EVM", () => {
    const { sourceChain, destinationChain, interchainTransferOptions } = config.axelar;

    let evmChainProvider: EthersProvider;
    let xrplChainProvider: XrplProvider;

    let evmChainSigner: EthersSigner;
    let xrplChainSigner: XrplSigner;

    let evmJsonProvider: ethers.JsonRpcProvider;
    let xrplClient: Client;

    let evmChainWallet: ethers.Wallet;
    let xrplChainWallet: Wallet;

    let evmChainTranslator: EvmTranslator;
    let xrplChainTranslator: XrpTranslator;

    let destinationCallContract: CallContract;

    const pollingOpts = interchainTransferOptions as PollingOptions;

    before(async () => {
        // Ensure correct chain types for this test direction
        assertChainTypes(["evm"], sourceChain as unknown as AxelarBridgeChain);
        assertChainTypes(["xrp"], destinationChain as unknown as AxelarBridgeChain);

        // Providers
        evmJsonProvider = new ethers.JsonRpcProvider(sourceChain.urls.rpc);
        xrplClient = new Client(destinationChain.urls.ws);

        evmChainProvider = new EthersProvider(evmJsonProvider);
        xrplChainProvider = new XrplProvider(xrplClient);

        // Wallets
        evmChainWallet = new ethers.Wallet(sourceChain.account.privateKey, evmJsonProvider);
        xrplChainWallet = Wallet.fromSeed(destinationChain.account.privateKey);

        // Signers
        evmChainSigner = new EthersSigner(evmChainWallet, evmChainProvider);
        xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

        // Translators
        evmChainTranslator = new EvmTranslator();
        xrplChainTranslator = new XrpTranslator();

        // Contracts
        destinationCallContract = new CallContract(
            sourceChain.callContractWithTokenAddress, // This is the EVM contract address
            evmChainWallet,
        );

        // Ensure XRPL client is connected
        if (!xrplClient.isConnected()) {
            await xrplClient.connect();
        }
    });

    describe("from xrp Source chain to evm Destination chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should update destination state when a non-empty message is sent", async () => {
            const encodedPayload = AbiCoder.defaultAbiCoder().encode(["string"], ["Hello Sidechain"]);
            const amount = (Math.random() + 5).toFixed(6);

            const tx = await xrplChainSigner.callContractWithToken(
                amount,
                new Token({} as any),
                destinationChain.interchainTokenServiceAddress,
                xrplChainTranslator.translate("evm", sourceChain.name),
                xrplChainTranslator.translate(ChainType.EVM, sourceChain.callContractWithTokenAddress),
                encodedPayload.slice(2),
            );
            const confirmedTx = await tx.wait();

            let finalValue: BigNumberish;
            await polling(
                async () => {
                    finalValue = await destinationCallContract.value();
                    return finalValue.toString() === amount;
                },
                (result) => !result,
                pollingOpts,
            );
        });
    });
});
