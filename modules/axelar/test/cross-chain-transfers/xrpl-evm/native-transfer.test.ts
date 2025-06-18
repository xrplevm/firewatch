import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { XrplSigner, XrplSignerErrors } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
import config from "../../../module.config.json";
import { Client, dropsToXrp, Wallet, xrpToDrops } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Token } from "@firewatch/core/token";
import BigNumber from "bignumber.js";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { expectRevert } from "@testing/hardhat/utils";
import { expectBalanceUpdate } from "@shared/evm/utils";
import { expectFullExecution, expectAxelarError, expectGasAdded } from "@firewatch/bridge/utils";
import { describeOrSkip, itOrSkip } from "@testing/mocha/utils";
import { AxelarScanProvider, AxelarScanProviderErrors } from "@firewatch/bridge/providers/axelarscan";
import { Env } from "../../../../../packages/env/src/types/env";

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

        let xrplChainSigner: XrplSigner;

        let evmJsonProvider: ethers.JsonRpcProvider;
        let xrplClient: Client;

        let xrplChainWallet: Wallet;

        let xrplChainTranslator: XrpTranslator;

        let xrplEvmAddress: string;
        let translatedXrplEvmAddress: string;

        let xrplTransferAmount: string;
        let gasFeeAmount: string;

        before(async () => {
            evmJsonProvider = new ethers.JsonRpcProvider(xrplEvmChain.urls.rpc);
            xrplClient = new Client(xrplChain.urls.ws);

            xrplEvmChainProvider = new EthersProvider(evmJsonProvider);
            xrplChainProvider = new XrplProvider(xrplClient);
            axelarScanProvider = new AxelarScanProvider(xrplEvmChain.env as Env);

            xrplChainWallet = Wallet.fromSeed(xrplChain.accounts.privateKeys[1]);

            xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

            xrplChainTranslator = new XrpTranslator();

            xrplEvmAddress = xrplEvmChain.accounts.addresses[1];
            translatedXrplEvmAddress = xrplChainTranslator.translate(ChainType.EVM, xrplEvmAddress);

            xrplTransferAmount = xrpToDrops(xrplChain.interchainTransferOptions.amount);

            gasFeeAmount = xrpToDrops(xrplChain.interchainTransferOptions.gasFeeAmount);
        });

        describe("from xrpl chain to evm chain", () => {
            it("should transfer the xrp", async () => {
                const tx = await xrplChainSigner.transfer(
                    xrplTransferAmount,
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    translatedXrplEvmAddress,
                    {
                        gasFeeAmount: gasFeeAmount,
                    },
                );

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
            });

            it("should transfer dust", async () => {
                const dustAmount = (BigInt(gasFeeAmount) + 1n).toString();

                const tx = await xrplChainSigner.transfer(
                    dustAmount,
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    translatedXrplEvmAddress,
                    {
                        gasFeeAmount: gasFeeAmount,
                    },
                );

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
            });

            it("should extend 6 decimal places to 18 decimals properly when transferring from xrpl to evm", async () => {
                const amount = "3.123456";
                const amountAsDrops = xrpToDrops(amount);
                const amountAsWei = ethers.parseEther(amount).toString();

                const initialEvmBalance = await xrplEvmChainProvider.getNativeBalance(xrplEvmAddress);

                const tx = await xrplChainSigner.transfer(
                    amountAsDrops,
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    translatedXrplEvmAddress,
                    {
                        gasFeeAmount: gasFeeAmount,
                    },
                );

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);

                const gasFeeAsWei = ethers.parseEther(dropsToXrp(gasFeeAmount).toString()).toString();

                await expectBalanceUpdate(
                    async () => (await xrplEvmChainProvider.getNativeBalance(xrplEvmAddress)).toString(),
                    BigNumber(initialEvmBalance.toString()).plus(amountAsWei).minus(gasFeeAsWei).toString(),
                    pollingOpts,
                );
            });

            it("should stall at the “pay gas” step if the gas fee is too low", async () => {
                const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                    xrplChain.name,
                    xrplEvmChain.name,
                    xrplChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );
                const lowGasFee = BigNumber(gas_fee_amount).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();

                const tx = await xrplChainSigner.transfer(
                    xrplTransferAmount,
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    translatedXrplEvmAddress,
                    {
                        gasFeeAmount: lowGasFee,
                    },
                );

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
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    translatedXrplEvmAddress,
                    {
                        gasFeeAmount: lowGasFee,
                    },
                );

                await expectAxelarError(tx.hash, axelarScanProvider, AxelarScanProviderErrors.INSUFFICIENT_FEE, pollingOpts);

                const lowGasFee2 = BigNumber(gas_fee_amount).times(0.5).integerValue(BigNumber.ROUND_DOWN).toString();

                await xrplChainSigner.addGas(
                    lowGasFee2,
                    xrplChainTranslator.translate(ChainType.EVM, tx.hash),
                    xrplChain.interchainTokenServiceAddress,
                    new Token({} as any),
                );

                await expectGasAdded(tx.hash, axelarScanProvider, lowGasFee2, pollingOpts);
            });

            // TODO: failing in devnet, stuck in approving step from axelar -> xrpl-evm
            itOrSkip(
                "should succeed after topping up gas once the threshold is reached",
                !isChainEnvironment(["devnet"], config.xrplChain as unknown as AxelarBridgeChain),
                async () => {
                    const lowGasFee = BigNumber(gasFeeAmount).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();

                    const tx = await xrplChainSigner.transfer(
                        xrplTransferAmount,
                        new Token({} as any),
                        xrplChain.interchainTokenServiceAddress,
                        xrplEvmChain.name,
                        translatedXrplEvmAddress,
                        {
                            gasFeeAmount: lowGasFee,
                        },
                    );

                    const topUpGas = BigNumber(gasFeeAmount).minus(lowGasFee).toString();

                    await xrplChainSigner.addGas(
                        topUpGas,
                        xrplChainTranslator.translate(ChainType.EVM, tx.hash),
                        xrplChain.interchainTokenServiceAddress,
                        new Token({} as any),
                    );

                    await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts, 15);
                },
            );

            it("should revert when transferring 0 tokens", async () => {
                await expectRevert(
                    xrplChainSigner.transfer(
                        "0",
                        new Token({} as any),
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
