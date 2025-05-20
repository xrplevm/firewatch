import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { XrplSigner, XrplSignerErrors } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
import config from "../../../module.config.json";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { AxelarScanProvider, AxelarScanProviderErrors } from "@firewatch/bridge/providers/axelarscan";
import { Token } from "@firewatch/core/token";
import { PollingOptions } from "@shared/utils";
import BigNumber from "bignumber.js";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { describeOrSkip } from "@testing/mocha/utils";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { expectExecuted, expectAxelarError, expectXrplFailedDestination } from "@firewatch/bridge/utils";
import { InterchainToken } from "@shared/evm/contracts";
import { expectRevert } from "@testing/hardhat/utils";
import { expectBalanceUpdate } from "@shared/evm/utils";
import { Env } from "../../../../../packages/env/src/types/env";
import { HardhatErrors } from "@testing/hardhat/errors";

describeOrSkip(
    "Cross-Chain No-Native Transfer",
    () => {
        return (
            isChainType(["evm"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainType(["xrp"], config.xrplChain as unknown as AxelarBridgeChain)
        );
    },
    () => {
        const { xrplChain, xrplEvmChain } = config;
        const { interchainTransferOptions } = config.xrplEvmChain;
        const pollingOpts = config.axelar.pollingOptions;

        let whiteListedErc20: Token;
        let whiteListedIou: Token;

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
        let xrplAsWeiAmount: string;

        let gasLimit: number;

        before(async () => {
            isChainType(["evm"], xrplEvmChain as unknown as AxelarBridgeChain);
            isChainType(["xrp"], xrplChain as unknown as AxelarBridgeChain);

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

            whiteListedErc20 = new Token(xrplEvmChain.whiteListedErc20);
            whiteListedIou = new Token(xrplChain.whiteListedIou);

            interchainToken = new InterchainToken(whiteListedErc20.address!, xrplEvmChainWallet);

            xrplTransferAmount = xrpToDrops(xrplChain.interchainTransferOptions.amount);
            xrplEvmTransferAmount = ethers.parseUnits(xrplEvmChain.interchainTransferOptions.amount, whiteListedErc20.decimals).toString();
            xrplAsWeiAmount = ethers.parseUnits(xrplChain.interchainTransferOptions.amount, whiteListedIou.decimals).toString();

            gasLimit = xrplEvmChain.interchainTransferOptions.gasLimit;
        });

        describeOrSkip(
            "from ERC20 evm chain to xrpl chain",
            () => {
                return (
                    isChainEnvironment(["devnet", "testnet", "mainnet"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
                    isChainEnvironment(["devnet", "testnet", "mainnet"], config.xrplChain as unknown as AxelarBridgeChain)
                );
            },
            () => {
                it("should transfer the ERC20", async () => {
                    const initialDestBalance = await xrplChainProvider.getIOUBalance(
                        xrplChainWallet.address,
                        whiteListedIou.address!,
                        whiteListedIou.symbol,
                    );

                    const initialErc20Balance = await interchainToken.balanceOf(xrplEvmChainWallet.address);

                    const recipient = xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address);
                    const gasValue = await axelarScanProvider.estimateGasFee(
                        xrplEvmChain.name,
                        xrplChain.name,
                        xrplEvmChain.nativeToken.symbol,
                        200_000,
                    );

                    const tx = await interchainToken.interchainTransfer(xrplChain.name, recipient, xrplEvmTransferAmount, "0x", {
                        value: gasValue,
                        gasLimit: gasLimit,
                    });

                    await expectExecuted(tx.hash, axelarScanProvider, pollingOpts);

                    await expectBalanceUpdate(
                        async () =>
                            await xrplChainProvider.getIOUBalance(xrplChainWallet.address, whiteListedIou.address!, whiteListedIou.symbol),
                        BigNumber(initialDestBalance.toString()).plus(xrplEvmTransferAmount).toString(),
                        interchainTransferOptions as PollingOptions,
                    );

                    const expectedErc20Balance = BigNumber(initialErc20Balance.toString()).minus(xrplEvmTransferAmount).toString();

                    await expectBalanceUpdate(
                        async () => (await interchainToken.balanceOf(xrplEvmChainWallet.address)).toString(),
                        expectedErc20Balance,
                        interchainTransferOptions as PollingOptions,
                    );
                });

                it("should revert when transferring to a non-existent XRPL account without reserve", async () => {
                    const newWallet = Wallet.generate();

                    const gasValue = await axelarScanProvider.estimateGasFee(
                        xrplEvmChain.name,
                        xrplChain.name,
                        xrplEvmChain.nativeToken.symbol,
                        200_000,
                    );

                    const tx = await xrplEvmChainSigner.transfer(
                        xrplEvmTransferAmount,
                        whiteListedErc20 as Token,
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
                        200_000,
                    );
                    await expectRevert(
                        xrplEvmChainSigner.transfer(
                            "0",
                            whiteListedErc20 as Token,
                            xrplEvmChain.interchainTokenServiceAddress,
                            xrplChain.name,
                            xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                            {
                                gasValue: gasValue,
                                gasLimit: gasLimit,
                            },
                        ),
                        HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                    );
                });

                it("should revert when transferring more than the balance", async () => {
                    const balance = await interchainToken.balanceOf(xrplEvmChainWallet.address);

                    const amount = BigNumber(balance.toString()).plus(100).toString();

                    const gasValue = await axelarScanProvider.estimateGasFee(
                        xrplEvmChain.name,
                        xrplChain.name,
                        xrplEvmChain.nativeToken.symbol,
                        200_000,
                    );

                    await expectRevert(
                        xrplEvmChainSigner.transfer(
                            amount,
                            whiteListedErc20 as Token,
                            xrplEvmChain.interchainTokenServiceAddress,
                            xrplChain.name,
                            xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                            {
                                gasValue: gasValue,
                                gasLimit: gasLimit,
                            },
                        ),
                        HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                    );
                });
            },
        );

        describeOrSkip(
            "from IOU xrpl chain to evm chain",
            () => {
                return (
                    isChainEnvironment(["devnet", "testnet", "mainnet"], config.xrplChain as unknown as AxelarBridgeChain) &&
                    isChainEnvironment(["devnet", "testnet", "mainnet"], config.xrplEvmChain as unknown as AxelarBridgeChain)
                );
            },
            () => {
                it("should transfer the IOU with interchain transfer method", async () => {
                    const erc20 = xrplEvmChainProvider.getERC20Contract(whiteListedErc20.address!, xrplEvmChainWallet);
                    const initialDestBalance = await erc20.balanceOf(xrplEvmChainWallet.address);
                    const initialSourceBalance = await xrplChainProvider.getIOUBalance(
                        xrplChainWallet.address,
                        whiteListedIou.address!,
                        whiteListedIou.symbol,
                    );

                    const tx = await xrplChainSigner.transfer(
                        xrplTransferAmount,
                        whiteListedIou,
                        xrplChain.interchainTokenServiceAddress,
                        xrplEvmChain.name,
                        xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                    );

                    const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                        xrplChain.name,
                        xrplEvmChain.name,
                        xrplChain.nativeToken.symbol,
                        200_000,
                    );
                    await xrplChainSigner.addGas(
                        gas_fee_amount,
                        xrplChainTranslator.translate(ChainType.EVM, tx.hash),
                        xrplChain.interchainTokenServiceAddress,
                        new Token({} as any),
                    );

                    await expectExecuted(tx.hash, axelarScanProvider, pollingOpts);

                    await expectBalanceUpdate(
                        async () => (await erc20.balanceOf(xrplEvmChainWallet.address)).toString(),
                        BigNumber(initialDestBalance.toString()).plus(xrplAsWeiAmount.toString()).toString(),
                        interchainTransferOptions as PollingOptions,
                    );

                    const expectedSourceBalance = BigNumber(initialSourceBalance.toString()).minus(BigNumber(xrplAsWeiAmount)).toString();
                    await expectBalanceUpdate(
                        async () =>
                            (
                                await xrplChainProvider.getIOUBalance(
                                    xrplChainWallet.address,
                                    whiteListedIou.address!,
                                    whiteListedIou.symbol,
                                )
                            ).toString(),
                        expectedSourceBalance,
                        interchainTransferOptions as PollingOptions,
                    );
                });

                it("should stall at the confirmation step if the gas fee is too low", async () => {
                    const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                        xrplChain.name,
                        xrplEvmChain.name,
                        xrplChain.nativeToken.symbol,
                        200_000,
                    );
                    const lowGasFee = BigNumber(gas_fee_amount).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();
                    const tx = await xrplChainSigner.transfer(
                        xrplTransferAmount,
                        whiteListedIou,
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
                });

                it("should get stuck at Pay Gas, after top-up gas when it doesn't reach threshold", async () => {
                    const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                        xrplChain.name,
                        xrplEvmChain.name,
                        xrplChain.nativeToken.symbol,
                        200_000,
                    );
                    const lowGasFee = BigNumber(gas_fee_amount).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();

                    const tx = await xrplChainSigner.transfer(
                        xrplTransferAmount,
                        whiteListedIou,
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

                    await xrplChainSigner.addGas(
                        lowGasFee,
                        xrplChainTranslator.translate(ChainType.EVM, tx.hash),
                        xrplChain.interchainTokenServiceAddress,
                        new Token({} as any),
                    );
                    await expectAxelarError(tx.hash, axelarScanProvider, AxelarScanProviderErrors.INSUFFICIENT_FEE, pollingOpts);
                });

                it("should send IOU after top-up gas", async () => {
                    const initialDestBalance = await xrplEvmChainProvider.getERC20Balance(
                        xrplEvmChainWallet.address,
                        whiteListedErc20.address!,
                    );
                    const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                        xrplChain.name,
                        xrplEvmChain.name,
                        xrplChain.nativeToken.symbol,
                        200_000,
                    );
                    const lowGasFee = BigNumber(gas_fee_amount).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();
                    const tx = await xrplChainSigner.transfer(
                        xrplTransferAmount,
                        whiteListedIou,
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

                    await expectExecuted(tx.hash, axelarScanProvider, pollingOpts);

                    await expectBalanceUpdate(
                        async () =>
                            (await xrplEvmChainProvider.getERC20Balance(xrplEvmChainWallet.address, whiteListedErc20.address!)).toString(),
                        BigNumber(initialDestBalance.toString()).plus(xrplAsWeiAmount).toString(),
                        interchainTransferOptions as PollingOptions,
                    );
                });

                it("should revert when transferring 0 tokens", async () => {
                    await expectRevert(
                        xrplChainSigner.transfer(
                            "0",
                            whiteListedIou,
                            xrplChain.interchainTokenServiceAddress,
                            xrplEvmChain.name,
                            xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                        ),
                        XrplSignerErrors.TRANSACTION_SUBMISSION_FAILED,
                    );
                });
            },
        );
    },
);
