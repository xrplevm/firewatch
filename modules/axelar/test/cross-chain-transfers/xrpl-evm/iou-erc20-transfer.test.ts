import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { XrplSigner, XrplSignerErrors } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
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
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { expectAxelarError, expectXrplFailedDestination, expectFullExecution, expectGasAdded } from "@firewatch/bridge/utils";
import { InterchainToken } from "@shared/evm/contracts";
import { expectRevert } from "@testing/hardhat/utils";
import { Env } from "../../../../../packages/env/src/types/env";
import { HardhatErrors } from "@testing/hardhat/errors";

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

        let erc20: Token;
        let iou: Token;

        let xrplEvmChainProvider: EthersProvider;
        let xrplChainProvider: XrplProvider;
        let axelarScanProvider: AxelarScanProvider;

        let xrplEvmChainSigner: EthersSigner;
        let xrplChainSigner: XrplSigner;

        let evmJsonProvider: ethers.JsonRpcProvider;
        let xrplClient: Client;

        let xrplEvmChainWallet: ethers.Wallet;
        let xrplChainWallet: Wallet;

        let xrplEvmChainTranslator: EvmTranslator;
        let xrplChainTranslator: XrpTranslator;

        let interchainToken: InterchainToken;

        let xrplTransferAmount: string;
        let xrplEvmTransferAmount: string;

        let gasLimit: number;

        before(async () => {
            evmJsonProvider = new ethers.JsonRpcProvider(xrplEvmChain.urls.rpc);
            xrplClient = new Client(xrplChain.urls.ws);

            xrplEvmChainProvider = new EthersProvider(evmJsonProvider);
            xrplChainProvider = new XrplProvider(xrplClient);
            axelarScanProvider = new AxelarScanProvider(xrplChain.env as Env);

            xrplEvmChainWallet = new ethers.Wallet(xrplEvmChain.account.privateKey, evmJsonProvider);
            xrplChainWallet = Wallet.fromSeed(xrplChain.account.privateKey);

            xrplEvmChainSigner = new EthersSigner(xrplEvmChainWallet, xrplEvmChainProvider);
            xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

            xrplEvmChainTranslator = new EvmTranslator();
            xrplChainTranslator = new XrpTranslator();

            erc20 = new Token(xrplEvmChain.erc20);
            iou = new Token(xrplChain.iou);

            interchainToken = new InterchainToken(erc20.address!, xrplEvmChainWallet);

            xrplTransferAmount = xrpToDrops(xrplChain.interchainTransferOptions.amount);
            xrplEvmTransferAmount = ethers.parseUnits(xrplEvmChain.interchainTransferOptions.amount, erc20.decimals).toString();

            gasLimit = xrplEvmChain.interchainTransferOptions.gasLimit;
        });

        describe("from erc20 evm chain to xrpl chain", () => {
            it("should transfer the erc20", async () => {
                const recipient = xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address);
                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );

                const tx = await interchainToken.interchainTransfer(xrplChain.name, recipient, xrplEvmTransferAmount, "0x", {
                    value: gasValue,
                    gasLimit: gasLimit,
                });

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
            });

            it("should revert when transferring to a non-existent xrpl account without reserve", async () => {
                const newWallet = Wallet.generate();

                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );

                await xrplEvmChainSigner.transfer(
                    xrplEvmTransferAmount,
                    erc20 as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    xrplEvmChainTranslator.translate(ChainType.XRP, newWallet.address),
                    {
                        gasValue: gasValue,
                        gasLimit: gasLimit,
                    },
                );

                await expectXrplFailedDestination(
                    xrplChainProvider,
                    xrplChain.axelarGatewayAddress,
                    newWallet.address,
                    "tecNO_DST",
                    pollingOpts,
                );
            });

            it("should revert when transferring 0 tokens", async () => {
                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );
                await expectRevert(
                    xrplEvmChainSigner.transfer(
                        "0",
                        erc20 as Token,
                        xrplEvmChain.interchainTokenServiceAddress,
                        xrplChain.name,
                        xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                        {
                            gasValue: gasValue,
                            gasLimit: gasLimit,
                        },
                    ),
                    HardhatErrors.TRANSACTION_EXECUTION_REVERTED,
                );
            });

            it("should revert when transferring more than the balance", async () => {
                const balance = await interchainToken.balanceOf(xrplEvmChainWallet.address);

                const amount = BigNumber(balance.toString()).plus(100).toString();

                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );

                await expectRevert(
                    xrplEvmChainSigner.transfer(
                        amount,
                        erc20 as Token,
                        xrplEvmChain.interchainTokenServiceAddress,
                        xrplChain.name,
                        xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                        {
                            gasValue: gasValue,
                            gasLimit: gasLimit,
                        },
                    ),
                    HardhatErrors.TRANSACTION_EXECUTION_REVERTED,
                );
            });
        });

        describe("from iou xrpl chain to evm chain", () => {
            it("should transfer the iou", async () => {
                const tx = await xrplChainSigner.transfer(
                    xrplTransferAmount,
                    iou,
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
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
                    xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
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
                    xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
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
                    xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
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
                        xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                    ),
                    XrplSignerErrors.TRANSACTION_SUBMISSION_FAILED,
                );
            });
        });
    },
);
