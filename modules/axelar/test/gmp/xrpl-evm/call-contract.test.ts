import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { AbiCoder, ethers } from "ethers";
import config from "../../../module.config.example.json";
import { polling, PollingOptions } from "@shared/utils";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { Token } from "@firewatch/core/token";
import { AxelarExecutableExample, InterchainTokenExecutable } from "@shared/evm/contracts";
import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Client, convertStringToHex, Wallet, xrpToDrops } from "xrpl";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { ChainType } from "@shared/modules/chain";
import { describeOrSkip } from "@testing/mocha/utils";

describeOrSkip(
    "GMP XRP -> EVM",
    () => {
        return (
            isChainType(["xrp"], config.xrplChain as unknown as AxelarBridgeChain) &&
            isChainType(["evm"], config.xrplEvmChain as unknown as AxelarBridgeChain)
        );
    },
    () => {
        const { xrplChain, xrplEvmChain } = config;

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

        let destAxExecAddress: string;
        let destIntTokenExecAddress: string;

        const pollingOpts = config.xrplEvmChain as PollingOptions;

        before(async () => {
            const {
                urls: destUrls,
                axelarExecutableExampleAddress, // Remove the rename here
                interchainTokenExecutableExampleAddress, // Remove the rename here
            } = xrplEvmChain;

            destAxExecAddress = axelarExecutableExampleAddress;
            destIntTokenExecAddress = interchainTokenExecutableExampleAddress;

            xrplClient = new Client(xrplChain.urls.ws);
            evmJsonProvider = new ethers.JsonRpcProvider(destUrls.rpc);

            xrplChainProvider = new XrplProvider(xrplClient);
            evmChainProvider = new EthersProvider(evmJsonProvider);

            xrplChainWallet = Wallet.fromSeed(xrplChain.account.privateKey);
            evmChainWallet = new ethers.Wallet(xrplEvmChain.account.privateKey, evmJsonProvider);

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

        describeOrSkip(
            "Memo call_contract, trigger AxelarExecutable.execute function",
            () => {
                return (
                    isChainEnvironment(["devnet", "testnet", "mainnet"], xrplChain as unknown as AxelarBridgeChain) &&
                    isChainEnvironment(["devnet", "testnet", "mainnet"], xrplEvmChain as unknown as AxelarBridgeChain)
                );
            },
            () => {
                it("should update destination state", async () => {
                    const msgText = `Hello from the source chain! ${Date.now()}`;
                    const abiCoder = new AbiCoder();
                    const payload = abiCoder.encode(["string"], [msgText]);

                    const tx = await xrplChainSigner.callContract(
                        xrplChain.interchainTokenServiceAddress,
                        xrplEvmChain.name,
                        xrplChainTranslator.translate(ChainType.EVM, destAxExecAddress),
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
            },
        );

        describeOrSkip(
            "Memo interchain_transfer, trigger InterchainTokenExecutable.execute function",
            () => {
                return (
                    isChainEnvironment(["devnet", "testnet", "mainnet"], xrplChain as unknown as AxelarBridgeChain) &&
                    isChainEnvironment(["devnet", "testnet", "mainnet"], xrplEvmChain as unknown as AxelarBridgeChain)
                );
            },
            () => {
                it("should update destination state", async () => {
                    const msgText = `Hello from the source chain! ${Date.now()}`;
                    const abiCoder = new AbiCoder();
                    const payload = abiCoder.encode(["string"], [msgText]);
                    const amount = "12";

                    const tx = await xrplChainSigner.transfer(
                        amount,
                        new Token({} as any),
                        xrplChain.interchainTokenServiceAddress,
                        xrplEvmChain.name,
                        xrplChainTranslator.translate(ChainType.EVM, xrplEvmChain.interchainTokenExecutableExampleAddress),
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
            },
        );
    },
);
