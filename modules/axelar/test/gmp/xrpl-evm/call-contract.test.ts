import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { AbiCoder, ethers } from "ethers";
import config from "../../../module.config.example.json";
import { polling, PollingOptions } from "@shared/utils";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { Token } from "@firewatch/core/token";
import { AxelarExecutableExample, InterchainTokenExecutable } from "@shared/evm/contracts";
import { expectMessageUpdate, expectEventEmission } from "../evm-evm/call-contract.helpers";
import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Client, convertStringToHex, Wallet, xrpToDrops } from "xrpl";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { ChainType } from "@shared/modules/chain";

describe.skip("GMP XRP -> EVM", () => {
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

    let destinationAxelarExecutableExample: AxelarExecutableExample;
    let destinationInterchainTokenExecutable: InterchainTokenExecutable;

    const pollingOpts = interchainTransferOptions as PollingOptions;

    before(async () => {
        assertChainTypes(["xrp"], sourceChain as unknown as AxelarBridgeChain);
        assertChainTypes(["evm"], destinationChain as unknown as AxelarBridgeChain);

        const {
            urls: destUrls,
            axelarExecutableExampleAddress: destAxExecAddress,
            interchainTokenExecutableExampleAddress: destIntTokenExecAddress,
        } = destinationChain;

        xrplClient = new Client(sourceChain.urls.ws);
        evmJsonProvider = new ethers.JsonRpcProvider(destUrls.rpc);

        xrplChainProvider = new XrplProvider(xrplClient);
        evmChainProvider = new EthersProvider(evmJsonProvider);

        xrplChainWallet = Wallet.fromSeed(sourceChain.account.privateKey);
        evmChainWallet = new ethers.Wallet(destinationChain.account.privateKey, evmJsonProvider);

        evmChainSigner = new EthersSigner(evmChainWallet, evmChainProvider);
        xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

        evmChainTranslator = new EvmTranslator();
        xrplChainTranslator = new XrpTranslator();

        destinationAxelarExecutableExample = new AxelarExecutableExample(destAxExecAddress, evmChainWallet);
        destinationInterchainTokenExecutable = new InterchainTokenExecutable(destIntTokenExecAddress, evmChainWallet);

        if (!xrplClient.isConnected()) {
            console.log("Connecting to XRPL...");
            await xrplClient.connect();
        }
        console.log("XRPL Client Connected:", xrplClient.isConnected());
    });

    describe("Memo call_contract, trigger AxelarExecutable.execute function", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should update destination state", async () => {
            const msgText = `Hello from the source chain! ${Date.now()}`;
            const abiCoder = new AbiCoder();
            const payload = abiCoder.encode(["string"], [msgText]);

            const tx = await xrplChainSigner.callContract(
                sourceChain.interchainTokenServiceAddress,
                destinationChain.name,
                xrplChainTranslator.translate(ChainType.EVM, destinationChain.axelarExecutableExampleAddress),
                xrplChainTranslator.translate(ChainType.EVM, payload),
                "3",
                new Token({} as any),
            );

            const confirmedTx = await tx.wait();
            console.log("Transaction Sent:", tx.hash);
            console.log("Transaction Confirmed:", confirmedTx);
            const txDetails = await xrplClient.request({
                command: "tx",
                transaction: confirmedTx.hash,
                binary: false,
            });

            console.log("Full XRPL Transaction Details:", txDetails);

            // TODO: correct decoding to check test passed
            let lastPayload: string;
            await polling(
                async () => {
                    lastPayload = await destinationAxelarExecutableExample.lastPayload();
                    console.log({ lastPayload });
                    return lastPayload.includes(payload);
                },
                (result) => !result,
                pollingOpts,
            );
        });
    });
    describe.skip("Memo interchain_transfer, trigger InterchainTokenExecutable.execute function", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should update destination state", async () => {
            const msgText = `Hello from the source chain! ${Date.now()}`;
            const abiCoder = new AbiCoder();
            const payload = abiCoder.encode(["string"], [msgText]);
            const amount = "12";

            const tx = await xrplChainSigner.transfer(
                amount,
                new Token({} as any),
                sourceChain.interchainTokenServiceAddress,
                destinationChain.name,
                xrplChainTranslator.translate(ChainType.EVM, destinationChain.interchainTokenExecutableExampleAddress),
                { payload: convertStringToHex(payload) },
            );

            const confirmedTx = await tx.wait();
            console.log("Transaction Sent:", tx.hash);
            console.log("Transaction Confirmed:", confirmedTx);
            const txDetails = await xrplClient.request({
                command: "tx",
                transaction: confirmedTx.hash,
                binary: false,
            });

            console.log("Full XRPL Transaction Details:", txDetails);

            // TODO: correct decoding to check test passed
            let finalValue: ethers.BigNumberish;
            let finalPayload: string;
            await polling(
                async () => {
                    finalValue = await destinationInterchainTokenExecutable.value();
                    console.log({ finalValue });
                    finalPayload = await destinationInterchainTokenExecutable.data();
                    console.log({ finalPayload });
                    return finalValue.toString().includes(msgText) && finalPayload.includes(convertStringToHex(payload));
                },
                (result) => !result,
                pollingOpts,
            );
        });
    });
});
