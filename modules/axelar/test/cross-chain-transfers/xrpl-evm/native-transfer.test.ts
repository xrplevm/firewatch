import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
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
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { HardhatErrors } from "@testing/hardhat/errors";
import { expectRevert } from "@testing/hardhat/utils";
import { expectBalanceUpdate } from "@shared/evm/utils";
import { expectFullExecution, expectAxelarError, expectXrplFailedDestination, expectGasAdded } from "@firewatch/bridge/utils";
import { describeOrSkip } from "@testing/mocha/utils";
import { AxelarScanProvider, AxelarScanProviderErrors } from "@firewatch/bridge/providers/axelarscan";
import { Env } from "../../../../../packages/env/src/types/env";
import { findLogIndex } from "@shared/evm/utils";
import { axelarGasServiceAbi } from "@shared/evm/contracts";
import { polling } from "@shared/utils";

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
        const { xrplEvmChain, xrplChain } = config;
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

        let xrplEvmChainTranslator: EvmTranslator;
        let xrplChainTranslator: XrpTranslator;

        let xrplTransferAmount: string;
        let xrplEvmTransferAmount: string;
        let gasFeeAmount: string;

        let xrplReserveAmount: string;

        before(async () => {
            isChainType(["evm"], xrplEvmChain as unknown as AxelarBridgeChain);
            isChainType(["xrp"], xrplChain as unknown as AxelarBridgeChain);

            evmJsonProvider = new ethers.JsonRpcProvider(xrplEvmChain.urls.rpc);
            xrplClient = new Client(xrplChain.urls.ws);

            xrplEvmChainProvider = new EthersProvider(evmJsonProvider);
            xrplChainProvider = new XrplProvider(xrplClient);
            axelarScanProvider = new AxelarScanProvider(xrplEvmChain.env as Env);

            xrplEvmChainWallet = new ethers.Wallet(xrplEvmChain.account.privateKey, evmJsonProvider);
            xrplChainWallet = Wallet.fromSeed(xrplChain.account.privateKey);

            xrplEvmChainSigner = new EthersSigner(xrplEvmChainWallet, xrplEvmChainProvider);
            xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

            xrplEvmChainTranslator = new EvmTranslator();
            xrplChainTranslator = new XrpTranslator();

            unfundedWallet = Wallet.generate();

            xrplTransferAmount = xrpToDrops(xrplChain.interchainTransferOptions.amount);
            xrplEvmTransferAmount = ethers.parseEther(xrplEvmChain.interchainTransferOptions.amount).toString();

            xrplReserveAmount = xrplChain.interchainTransferOptions.reserveAmount;
            gasFeeAmount = xrpToDrops(xrplChain.interchainTransferOptions.gasFeeAmount);
        });
        describe("from xrpl-evm chain to xrpl chain", () => {
            it("should transfer the token", async () => {
                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    200_000,
                );

                const tx = await xrplEvmChainSigner.transfer(
                    xrplEvmTransferAmount,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                    { gasValue: gasValue.toString() },
                );

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
            });

            it("should revert when transferring less than reserve xrp to a non-existing account", async () => {
                const amount = ethers.parseEther(BigNumber(xrplReserveAmount).times(0.2).toString()).toString();

                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    200_000,
                );

                const tx = await xrplEvmChainSigner.transfer(
                    amount,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    xrplEvmChainTranslator.translate(ChainType.XRP, unfundedWallet.address),
                    { gasValue: gasValue },
                );

                await expectXrplFailedDestination(
                    xrplChainProvider,
                    xrplChain.axelarGatewayAddress,
                    unfundedWallet.address,
                    "tecNO_DST_INSUF_XRP",
                    pollingOpts,
                );
            });

            it("should succeed when transferring ≥ reserve to a non-existing account", async () => {
                const amount = ethers.parseEther(xrplReserveAmount).toString();
                const newWallet = Wallet.generate();

                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    200_000,
                );

                const tx = await xrplEvmChainSigner.transfer(
                    amount,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    xrplEvmChainTranslator.translate(ChainType.XRP, newWallet.address),
                    { gasValue: gasValue },
                );

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
            });

            it("should revert when transferring 0 xrp", async () => {
                await expectRevert(
                    xrplEvmChainSigner.transfer(
                        "0",
                        xrplEvmChain.nativeToken as Token,
                        xrplEvmChain.interchainTokenServiceAddress,
                        xrplChain.name,
                        xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                    ),
                    HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                );
            });

            it("should revert when transferring dust", async () => {
                const dustAmount = `0.${"0".repeat(xrplChain.nativeToken.decimals)}1`;
                const amount = ethers.parseEther(dustAmount).toString();
                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    200_000,
                );

                const tx = await xrplEvmChainSigner.transfer(
                    amount,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                    { gasValue: gasValue },
                );

                await expectAxelarError(tx.hash, axelarScanProvider, AxelarScanProviderErrors.INVALID_TRANSFER_AMOUNT, pollingOpts);
            });

            it("should get stuck at pay gas, when low gasvalue send", async () => {
                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    200_000,
                );
                const lowGasValue = BigNumber(gasValue).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();
                const tx = await xrplEvmChainSigner.transfer(
                    xrplEvmTransferAmount,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                    { gasValue: lowGasValue },
                );

                await expectAxelarError(tx.hash, axelarScanProvider, AxelarScanProviderErrors.INSUFFICIENT_FEE, pollingOpts);
            });

            // TODO: Axelar not recognizing the addGas txs, not sure if it shouldn't, or its findLogIndex helpers bad
            it("should succeed in resuming a stuck transfer after topping up gas", async () => {
                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    200_000,
                );
                const lowGasValue = BigNumber(gasValue).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();
                const tx = await xrplEvmChainSigner.transfer(
                    xrplEvmTransferAmount,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                    { gasValue: lowGasValue },
                );
                await expectAxelarError(tx.hash, axelarScanProvider, AxelarScanProviderErrors.INSUFFICIENT_FEE, pollingOpts);

                const topUpGasValue = ethers.parseEther("0.3").toString();
                const receipt = await tx.wait();

                const logIndex = findLogIndex(receipt.receipt, axelarGasServiceAbi, "ContractCall");

                await xrplEvmChainSigner.addNativeGas(xrplEvmChain.axelarGasServiceAddress, tx.hash, logIndex!, topUpGasValue);
                await expectGasAdded(tx.hash, axelarScanProvider, topUpGasValue, pollingOpts);

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts, 15);
            });

            it("should revert when transferring to an invalid destination address (malformed address)", async () => {
                await expectRevert(
                    xrplEvmChainSigner.transfer(
                        xrplEvmTransferAmount,
                        xrplEvmChain.nativeToken as Token,
                        xrplEvmChain.interchainTokenServiceAddress,
                        xrplChain.name,
                        xrplChainWallet.address,
                    ),
                    HardhatErrors.INVALID_BYTESLIKE_VALUE,
                );
            });

            it("should truncate amounts with more decimals than supported (>6)", async () => {
                const amount = "2.1234567";
                const expectedAmount = "2.123456";

                const amountAsWei = ethers.parseEther(amount).toString();
                const expectedAmountAsDrops = xrpToDrops(expectedAmount);

                const initialBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    200_000,
                );

                const tx = await xrplEvmChainSigner.transfer(
                    amountAsWei,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                    { gasValue: gasValue },
                );
                const receipt = await tx.wait();

                await expectFullExecution(receipt.hash, axelarScanProvider, pollingOpts);

                await expectBalanceUpdate(
                    async () => (await xrplChainProvider.getNativeBalance(xrplChainWallet.address)).toString(),
                    BigNumber(initialBalance.toString()).plus(expectedAmountAsDrops).toString(),
                    pollingOpts,
                );
            });

            it("should process exact amount when transferring with exactly 6 decimals", async () => {
                const amount = "1.123456";
                const amountAsWei = ethers.parseEther(amount).toString();

                const initialBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    200_000,
                );

                const tx = await xrplEvmChainSigner.transfer(
                    amountAsWei,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                    { gasValue: gasValue },
                );
                const receipt = await tx.wait();

                await expectFullExecution(receipt.hash, axelarScanProvider, pollingOpts);

                await expectBalanceUpdate(
                    async () => (await xrplChainProvider.getNativeBalance(xrplChainWallet.address)).toString(),
                    BigNumber(initialBalance.toString()).plus(xrpToDrops(amount)).toString(),
                    pollingOpts,
                );
            });
        });

        describe("from xrpl chain to evm chain", () => {
            it("should transfer the xrp", async () => {
                const tx = await xrplChainSigner.transfer(
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
            });

            // TODO: Axelar not recognizing the txs, not sure if it shouldn't, or is malfunctioning
            it("should revert when transferring dust", async () => {
                const dustAmount = "1";
                const tx = await xrplChainSigner.transfer(
                    dustAmount,
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                    {
                        gasFeeAmount: gasFeeAmount,
                    },
                );

                await expectAxelarError(tx.hash, axelarScanProvider, AxelarScanProviderErrors.INVALID_TRANSFER_AMOUNT, pollingOpts);
            });

            it("should extend 6 decimal places to 18 decimals properly when transferring from XRPL to EVM", async () => {
                const amount = "3.123456";
                const amountAsDrops = xrpToDrops(amount);
                const amountAsWei = ethers.parseEther(amount).toString();

                const initialEvmBalance = await xrplEvmChainProvider.getNativeBalance(xrplEvmChainWallet.address);

                const tx = await xrplChainSigner.transfer(
                    amountAsDrops,
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                    {
                        gasFeeAmount: gasFeeAmount,
                    },
                );

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);

                const gasFeeAsWei = ethers.parseEther(dropsToXrp(gasFeeAmount).toString()).toString();

                await expectBalanceUpdate(
                    async () => (await xrplEvmChainProvider.getNativeBalance(xrplEvmChainWallet.address)).toString(),
                    BigNumber(initialEvmBalance.toString()).plus(amountAsWei).minus(gasFeeAsWei).toString(),
                    pollingOpts,
                );
            });

            it("should stall at the “pay gas” step if the gas fee is too low", async () => {
                const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                    xrplChain.name,
                    xrplEvmChain.name,
                    xrplChain.nativeToken.symbol,
                    200_000,
                );
                const lowGasFee = BigNumber(gas_fee_amount).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();

                const tx = await xrplChainSigner.transfer(
                    xrplTransferAmount,
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
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
                    200_000,
                );
                const lowGasFee = BigNumber(gas_fee_amount).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();

                const tx = await xrplChainSigner.transfer(
                    xrplTransferAmount,
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
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
            it("should succeed after topping up gas once the threshold is reached", async () => {
                const lowGasFee = BigNumber(gasFeeAmount).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();

                const tx = await xrplChainSigner.transfer(
                    xrplTransferAmount,
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
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
            });

            it("should revert when transferring 0 tokens", async () => {
                await expectRevert(
                    xrplChainSigner.transfer(
                        "0",
                        new Token({} as any),
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
