import { XrplSigner, XrplSignerErrors } from "@firewatch/bridge/signers/xrp/xrpl";
import config from "../../../module.config.json";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { AxelarScanProvider, AxelarScanProviderErrors } from "@firewatch/bridge/providers/axelarscan";
import { Token } from "@firewatch/core/token";
import BigNumber from "bignumber.js";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { describeOrSkip } from "@testing/mocha/utils";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { expectAxelarError, expectFullExecution, expectGasAdded } from "@firewatch/bridge/utils";
import { expectRevert } from "@testing/hardhat/utils";
import { Env } from "../../../../../packages/env/src/types/env";

describeOrSkip(
    "cross-chain no-native transfer",
    () => {
        return (
            isChainType(["evm"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainType(["xrp"], config.xrplChain as unknown as AxelarBridgeChain) &&
            // There's no white listed IOU-ERC20 on devnet
            isChainEnvironment(["testnet", "mainnet"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainEnvironment(["testnet", "mainnet"], config.evmChain as unknown as AxelarBridgeChain)
        );
    },
    () => {
        const { xrplChain, xrplEvmChain, axelar } = config;
        const pollingOpts = config.axelar.pollingOptions;

        let iou: Token;

        let xrplChainProvider: XrplProvider;
        let axelarScanProvider: AxelarScanProvider;

        let xrplChainSigner: XrplSigner;

        let xrplClient: Client;

        let xrplChainWallet: Wallet;

        let xrplChainTranslator: XrpTranslator;

        let xrplTransferAmount: string;

        let translatedXrplEvmAddress: string;

        before(async () => {
            xrplClient = new Client(xrplChain.urls.ws);

            xrplChainProvider = new XrplProvider(xrplClient);
            axelarScanProvider = new AxelarScanProvider(xrplChain.env as Env);

            xrplChainWallet = Wallet.fromSeed(xrplChain.accounts[0].privateKey);

            xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

            xrplChainTranslator = new XrpTranslator();

            translatedXrplEvmAddress = xrplChainTranslator.translate(ChainType.EVM, xrplEvmChain.accounts[0].address);

            iou = new Token(xrplChain.iou);

            xrplTransferAmount = xrpToDrops(xrplChain.interchainTransferOptions.amount);
        });

        describe("from iou xrpl chain to evm chain", () => {
            it("should transfer the iou", async () => {
                const tx = await xrplChainSigner.transfer(
                    xrplTransferAmount,
                    iou,
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    translatedXrplEvmAddress,
                );

                const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                    xrplChain.name,
                    xrplEvmChain.name,
                    xrplChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );
                await xrplChainSigner.addGas(
                    gas_fee_amount,
                    xrplChainTranslator.translate(ChainType.EVM, tx.hash),
                    xrplChain.interchainTokenServiceAddress,
                    new Token({} as any),
                );

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts, 15);
            });

            it("should stall at the confirmation step if the gas fee is too low", async () => {
                const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                    xrplChain.name,
                    xrplEvmChain.name,
                    xrplChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );
                const lowGasFee = BigNumber(gas_fee_amount).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();
                const tx = await xrplChainSigner.transfer(
                    xrplTransferAmount,
                    iou,
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    translatedXrplEvmAddress,
                );

                await xrplChainSigner.addGas(
                    lowGasFee,
                    xrplChainTranslator.translate(ChainType.EVM, tx.hash),
                    xrplChain.interchainTokenServiceAddress,
                    new Token({} as any),
                );

                await expectGasAdded(tx.hash, axelarScanProvider, lowGasFee, pollingOpts);
                await expectAxelarError(tx.hash, axelarScanProvider, AxelarScanProviderErrors.INSUFFICIENT_FEE, pollingOpts);
            });

            it("should get stuck at pay gas, after top-up gas when it doesn't reach threshold", async () => {
                const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                    xrplChain.name,
                    xrplEvmChain.name,
                    xrplChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );
                const lowGasFee = BigNumber(gas_fee_amount).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();

                const tx = await xrplChainSigner.transfer(
                    xrplTransferAmount,
                    iou,
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    translatedXrplEvmAddress,
                );

                await xrplChainSigner.addGas(
                    lowGasFee,
                    xrplChainTranslator.translate(ChainType.EVM, tx.hash),
                    xrplChain.interchainTokenServiceAddress,
                    new Token({} as any),
                );

                await expectAxelarError(tx.hash, axelarScanProvider, AxelarScanProviderErrors.INSUFFICIENT_FEE, pollingOpts);
                await expectGasAdded(tx.hash, axelarScanProvider, lowGasFee, pollingOpts);

                const lowGasFee2 = BigNumber(gas_fee_amount).times(0.2).integerValue(BigNumber.ROUND_DOWN).toString();

                await xrplChainSigner.addGas(
                    lowGasFee2,
                    xrplChainTranslator.translate(ChainType.EVM, tx.hash),
                    xrplChain.interchainTokenServiceAddress,
                    new Token({} as any),
                );
                await expectGasAdded(tx.hash, axelarScanProvider, lowGasFee2, pollingOpts);
            });

            it("should send iou after top-up gas", async () => {
                const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                    xrplChain.name,
                    xrplEvmChain.name,
                    xrplChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );
                const lowGasFee = BigNumber(gas_fee_amount).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();
                const tx = await xrplChainSigner.transfer(
                    xrplTransferAmount,
                    iou,
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    translatedXrplEvmAddress,
                );

                await xrplChainSigner.addGas(
                    lowGasFee,
                    xrplChainTranslator.translate(ChainType.EVM, tx.hash),
                    xrplChain.interchainTokenServiceAddress,
                    new Token({} as any),
                );
                const remainingGas = BigNumber(gas_fee_amount).minus(lowGasFee).toString();
                await xrplChainSigner.addGas(
                    remainingGas,
                    xrplChainTranslator.translate(ChainType.EVM, tx.hash),
                    xrplChain.interchainTokenServiceAddress,
                    new Token({} as any),
                );

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts, 15);
            });

            it("should revert when transferring 0 tokens", async () => {
                await expectRevert(
                    xrplChainSigner.transfer(
                        "0",
                        iou,
                        xrplChain.interchainTokenServiceAddress,
                        xrplEvmChain.name,
                        translatedXrplEvmAddress,
                    ),
                    XrplSignerErrors.TRANSACTION_SUBMISSION_FAILED,
                );
            });
        });
    },
);
