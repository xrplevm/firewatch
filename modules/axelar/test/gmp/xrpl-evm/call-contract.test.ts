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
import { AxelarScanProvider } from "@firewatch/bridge/providers/axelarscan";
import { Env } from "@firewatch/env/types";

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
        let axelarScanProvider: AxelarScanProvider;

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

        let xrplTransferAmount: string;

        const pollingOpts = config.xrplEvmChain as PollingOptions;

        before(async () => {
            const { urls: destUrls, axelarExecutableExampleAddress, interchainTokenExecutableExampleAddress } = xrplEvmChain;

            destAxExecAddress = axelarExecutableExampleAddress;
            destIntTokenExecAddress = interchainTokenExecutableExampleAddress;

            xrplClient = new Client(xrplChain.urls.ws);
            evmJsonProvider = new ethers.JsonRpcProvider(destUrls.rpc);
            axelarScanProvider = new AxelarScanProvider(xrplEvmChain.env as Env);

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

            xrplTransferAmount = xrpToDrops(xrplChain.interchainTransferOptions.amount);
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
                    await xrplChainSigner.callContract(
                        xrplChain.interchainTokenServiceAddress,
                        xrplEvmChain.name,
                        xrplChainTranslator.translate(ChainType.EVM, destAxExecAddress),
                        xrplChainTranslator.translate(ChainType.EVM, payload),
                        xrplTransferAmount,
                        new Token({} as any),
                    );

                    await polling(
                        async () => {
                            const lastPayload = await destinationAxelarExecutableExample.lastPayload();
                            const asciiHex = ethers.toUtf8String(lastPayload);
                            const abiHex = "0x" + asciiHex;

                            const [decoded] = abiCoder.decode(["string"], abiHex);
                            return decoded.includes(msgText);
                        },
                        (done) => !done,
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

                    await xrplChainSigner.transfer(
                        xrplTransferAmount,
                        new Token({} as any),
                        xrplChain.interchainTokenServiceAddress,
                        xrplEvmChain.name,
                        xrplChainTranslator.translate(ChainType.EVM, xrplEvmChain.interchainTokenExecutableExampleAddress),
                        { payload: xrplChainTranslator.translate(ChainType.EVM, payload) },
                    );

                    let decodedMsg: string;

                    await polling(
                        async () => {
                            const finalPayload = await destinationInterchainTokenExecutable.data();
                            let asciiHex = ethers.toUtf8String(finalPayload);
                            if (asciiHex.startsWith("0x")) {
                                asciiHex = asciiHex.slice(2);
                            }
                            const abiHex = "0x" + asciiHex;

                            [decodedMsg] = abiCoder.decode(["string"], abiHex);

                            return decodedMsg === msgText;
                        },
                        (done) => !done,
                        pollingOpts,
                    );
                });
            },
        );
    },
);
