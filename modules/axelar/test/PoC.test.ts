import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers } from "ethers";
import config from "../module.config.json";
import { Client, Wallet } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { AxelarScanProvider } from "@firewatch/bridge/providers/axelarscan";
import { Token } from "@firewatch/core/token";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { describeOrSkip } from "@testing/mocha/utils";
import { AxelarBridgeChain } from "../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { expectFullExecution } from "@firewatch/bridge/utils";
import { Env } from "../../../packages/env/src/types/env";
import { XrplSignerService } from "@firewatch/signer_service/signer-service/xrp";
import { EvmSignerService } from "@firewatch/signer_service/signer-service/evm";
import { itParallel } from "@testing/mocha/utils";
import { getSignerWithRetry } from "@firewatch/signer_service/signer-service/utils";

describeOrSkip(
    "cross-chain no-native transfer",
    () => {
        return (
            isChainType(["evm"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainType(["xrp"], config.xrplChain as unknown as AxelarBridgeChain) &&
            isChainEnvironment(["testnet", "mainnet"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainEnvironment(["testnet", "mainnet"], config.evmChain as unknown as AxelarBridgeChain)
        );
    },
    () => {
        const { xrplChain, xrplEvmChain, axelar } = config;
        const pollingOpts = config.axelar.pollingOptions;

        let erc20: Token;
        let iou: Token;

        let xrplChainProvider: XrplProvider;
        let axelarScanProvider: AxelarScanProvider;

        let xrplSignerService: XrplSignerService;
        let evmSignerService: EvmSignerService;

        let evmJsonProvider: ethers.JsonRpcProvider;
        let xrplClient: Client;

        let xrplEvmChainWallet: ethers.Wallet;
        let xrplChainWallet: Wallet;

        let xrplEvmChainTranslator: EvmTranslator;
        let xrplEvmTransferAmount: string;

        before(async () => {
            evmJsonProvider = new ethers.JsonRpcProvider(xrplEvmChain.urls.rpc);
            xrplClient = new Client(xrplChain.urls.ws);

            xrplChainProvider = new XrplProvider(xrplClient);
            axelarScanProvider = new AxelarScanProvider(xrplChain.env as Env);

            xrplEvmChainWallet = new ethers.Wallet(xrplEvmChain.account.privateKey, evmJsonProvider);
            xrplChainWallet = Wallet.fromSeed(xrplChain.account.privateKey);

            xrplSignerService = new XrplSignerService(xrplChainProvider);
            evmSignerService = new EvmSignerService(xrplEvmChain.urls.rpc);

            await xrplSignerService.loadSigners(xrplChain.privateKeys);
            await evmSignerService.loadSigners(xrplEvmChain.privateKeys);

            xrplEvmChainTranslator = new EvmTranslator();

            erc20 = new Token(xrplEvmChain.erc20);
            iou = new Token(xrplChain.iou);

            xrplEvmTransferAmount = ethers.parseEther(xrplEvmChain.interchainTransferOptions.amount).toString();
        });

        type EvmContext = {
            xrplEvmChainSigner: EthersSigner;
        };

        itParallel<EvmContext>(
            "evm tests",
            {
                beforeEach: async () => {
                    const xrplEvmChainSigner = await getSignerWithRetry(evmSignerService, xrplEvmChain.type as ChainType);
                    return { xrplEvmChainSigner };
                },
                afterEach: async (context) => {
                    await evmSignerService.releaseSigner(context.xrplEvmChainSigner);

                    if ((context as any).isThirdTest) {
                        throw new Error("Deliberate failure in afterEach for test 3");
                    }
                },
            },
            [
                {
                    name: "should transfer the token 1",
                    fn: async (context) => {
                        const gasValue = await axelarScanProvider.estimateGasFee(
                            xrplEvmChain.name,
                            xrplChain.name,
                            xrplEvmChain.nativeToken.symbol,
                            axelar.estimateGasFee.gasLimit,
                        );

                        const tx = await context.xrplEvmChainSigner.transfer(
                            xrplEvmTransferAmount,
                            xrplEvmChain.nativeToken as Token,
                            xrplEvmChain.interchainTokenServiceAddress,
                            xrplChain.name,
                            xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                            { gasValue: gasValue.toString() },
                        );
                        console.log("context", await context.xrplEvmChainSigner.getAddress());
                        console.log(`EVM transfer tx: ${tx.hash}`);

                        await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
                    },
                },
                {
                    name: "should transfer the token 2",
                    fn: async (context) => {
                        const gasValue = await axelarScanProvider.estimateGasFee(
                            xrplEvmChain.name,
                            xrplChain.name,
                            xrplEvmChain.nativeToken.symbol,
                            axelar.estimateGasFee.gasLimit,
                        );

                        const tx = await context.xrplEvmChainSigner.transfer(
                            xrplEvmTransferAmount,
                            xrplEvmChain.nativeToken as Token,
                            xrplEvmChain.interchainTokenServiceAddress,
                            xrplChain.name,
                            xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                            { gasValue: gasValue.toString() },
                        );

                        console.log("context", await context.xrplEvmChainSigner.getAddress());
                        console.log(`EVM transfer tx: ${tx.hash}`);
                        await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
                    },
                },
                {
                    name: "should transfer the token 3",
                    fn: async (context) => {
                        const gasValue = await axelarScanProvider.estimateGasFee(
                            xrplEvmChain.name,
                            xrplChain.name,
                            xrplEvmChain.nativeToken.symbol,
                            axelar.estimateGasFee.gasLimit,
                        );

                        const tx = await context.xrplEvmChainSigner.transfer(
                            xrplEvmTransferAmount,
                            xrplEvmChain.nativeToken as Token,
                            xrplEvmChain.interchainTokenServiceAddress,
                            xrplChain.name,
                            xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                            { gasValue: gasValue.toString() },
                        );
                        console.log("context", await context.xrplEvmChainSigner.getAddress());
                        console.log(`EVM transfer tx: ${tx.hash}`);

                        await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
                    },
                },
            ],
        );
    },
);
