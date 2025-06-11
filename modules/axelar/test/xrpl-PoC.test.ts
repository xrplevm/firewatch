import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
import config from "../module.config.json";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Token } from "@firewatch/core/token";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { expectFullExecution } from "@firewatch/bridge/utils";
import { describeOrSkip, itOrSkip, itParallel } from "@testing/mocha/utils";
import { AxelarScanProvider } from "@firewatch/bridge/providers/axelarscan";
import { Env } from "../../../packages/env/src/types/env";
import { getSignerWithRetry } from "@firewatch/signer_service/signer-service/utils";
import { XrplSignerService } from "@firewatch/signer_service/signer-service/xrp";
import { EvmSignerService } from "@firewatch/signer_service/signer-service/evm";

describeOrSkip(
    "cross-chain native transfer",
    () => {
        return (
            isChainType(["evm"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainType(["xrp"], config.xrplChain as unknown as AxelarBridgeChain) &&
            isChainEnvironment(["devnet", "testnet", "mainnet"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainEnvironment(["devnet", "testnet", "mainnet"], config.evmChain as unknown as AxelarBridgeChain)
        );
    },
    () => {
        const { xrplEvmChain, xrplChain, axelar } = config;
        const pollingOpts = config.axelar.pollingOptions;

        let xrplEvmChainProvider: EthersProvider;
        let xrplChainProvider: XrplProvider;
        let axelarScanProvider: AxelarScanProvider;

        let xrplEvmChainSigner: EthersSigner;
        let xrplChainSigner: XrplSigner;

        let evmJsonProvider: ethers.JsonRpcProvider;
        let xrplClient: Client;

        let xrplEvmChainWallet: ethers.Wallet;
        let xrplChainWallet: Wallet;
        let unfundedWallet: Wallet;

        let xrplSignerService: XrplSignerService;
        let evmSignerService: EvmSignerService;

        let xrplEvmChainTranslator: EvmTranslator;
        let xrplChainTranslator: XrpTranslator;

        let xrplTransferAmount: string;
        let xrplEvmTransferAmount: string;
        let gasFeeAmount: string;

        let xrplReserveAmount: string;

        before(async () => {
            evmJsonProvider = new ethers.JsonRpcProvider(xrplEvmChain.urls.rpc);
            xrplClient = new Client(xrplChain.urls.ws);

            xrplEvmChainProvider = new EthersProvider(evmJsonProvider);
            xrplChainProvider = new XrplProvider(xrplClient);
            axelarScanProvider = new AxelarScanProvider(xrplEvmChain.env as Env);

            xrplEvmChainWallet = new ethers.Wallet(xrplEvmChain.account.privateKey, evmJsonProvider);
            xrplChainWallet = Wallet.fromSeed(xrplChain.account.privateKey);

            xrplEvmChainTranslator = new EvmTranslator();
            xrplChainTranslator = new XrpTranslator();

            unfundedWallet = Wallet.generate();

            xrplSignerService = new XrplSignerService(xrplChainProvider);
            evmSignerService = new EvmSignerService(xrplEvmChain.urls.rpc);

            await xrplSignerService.loadSigners(xrplChain.privateKeys);

            xrplTransferAmount = xrpToDrops(xrplChain.interchainTransferOptions.amount);
            xrplEvmTransferAmount = ethers.parseEther(xrplEvmChain.interchainTransferOptions.amount).toString();

            xrplReserveAmount = xrplChain.interchainTransferOptions.reserveAmount;
            gasFeeAmount = xrpToDrops(xrplChain.interchainTransferOptions.gasFeeAmount);
        });

        type XrplContext = {
            xrplChainSigner: XrplSigner;
        };

        itParallel<XrplContext>(
            "xrpl tests",
            {
                beforeEach: async () => {
                    const xrplChainSigner = await getSignerWithRetry(xrplSignerService, xrplChain.type as ChainType);
                    return { xrplChainSigner };
                },
                afterEach: async (context) => {
                    await xrplSignerService.releaseSigner(context.xrplChainSigner);

                    if ((context as any).isThirdTest) {
                        throw new Error("Deliberate failure in afterEach for test 3");
                    }
                },
            },
            [
                {
                    name: "should transfer the token 1",
                    fn: async (context) => {
                        const tx = await context.xrplChainSigner.transfer(
                            xrplTransferAmount,
                            new Token({} as any),
                            xrplChain.interchainTokenServiceAddress,
                            xrplEvmChain.name,
                            xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                            {
                                gasFeeAmount: gasFeeAmount,
                            },
                        );

                        await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
                    },
                },
                {
                    name: "should transfer the token 2",
                    fn: async (context) => {
                        const tx = await context.xrplChainSigner.transfer(
                            xrplTransferAmount,
                            new Token({} as any),
                            xrplChain.interchainTokenServiceAddress,
                            xrplEvmChain.name,
                            xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                            {
                                gasFeeAmount: gasFeeAmount,
                            },
                        );

                        await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
                    },
                },
                {
                    name: "should transfer the token 3",
                    fn: async (context) => {
                        const tx = await context.xrplChainSigner.transfer(
                            xrplTransferAmount,
                            new Token({} as any),
                            xrplChain.interchainTokenServiceAddress,
                            xrplEvmChain.name,
                            xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                            {
                                gasFeeAmount: gasFeeAmount,
                            },
                        );

                        await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
                    },
                },
            ],
        );
    },
);
