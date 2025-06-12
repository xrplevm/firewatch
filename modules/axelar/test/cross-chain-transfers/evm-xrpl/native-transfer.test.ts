import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers } from "ethers";
import config from "../../../module.config.json";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Token } from "@firewatch/core/token";
import BigNumber from "bignumber.js";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { HardhatErrors } from "@testing/hardhat/errors";
import { expectRevert } from "@testing/hardhat/utils";
import { expectBalanceUpdate } from "@shared/evm/utils";
import { expectFullExecution, expectAxelarError, expectXrplFailedDestination, expectGasAdded } from "@firewatch/bridge/utils";
import { describeOrSkip } from "@testing/mocha/utils";
import { AxelarScanProvider, AxelarScanProviderErrors } from "@firewatch/bridge/providers/axelarscan";
import { Env } from "../../../../../packages/env/src/types/env";
import { findLogIndex } from "@shared/evm/utils";
import { axelarGasServiceAbi } from "@shared/evm/contracts";

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

        let evmJsonProvider: ethers.JsonRpcProvider;
        let xrplClient: Client;

        let xrplEvmChainWallet: ethers.Wallet;
        let unfundedWallet: Wallet;

        let xrplEvmChainTranslator: EvmTranslator;

        let translatedXrplAddress: string;

        let xrplEvmTransferAmount: string;

        let xrplReserveAmount: string;

        before(async () => {
            evmJsonProvider = new ethers.JsonRpcProvider(xrplEvmChain.urls.rpc);
            xrplClient = new Client(xrplChain.urls.ws);

            xrplEvmChainProvider = new EthersProvider(evmJsonProvider);
            xrplChainProvider = new XrplProvider(xrplClient);
            axelarScanProvider = new AxelarScanProvider(xrplEvmChain.env as Env);

            xrplEvmChainWallet = new ethers.Wallet(xrplEvmChain.accounts.privateKeys[0], evmJsonProvider);

            xrplEvmChainSigner = new EthersSigner(xrplEvmChainWallet, xrplEvmChainProvider);

            xrplEvmChainTranslator = new EvmTranslator();

            unfundedWallet = Wallet.generate();

            translatedXrplAddress = xrplEvmChainTranslator.translate(ChainType.XRP, xrplChain.accounts.addresses[0]);

            xrplEvmTransferAmount = ethers.parseEther(xrplEvmChain.interchainTransferOptions.amount).toString();

            xrplReserveAmount = xrplChain.interchainTransferOptions.reserveAmount;
        });
        describe("from xrpl-evm chain to xrpl chain", () => {
            it("should transfer the token", async () => {
                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );

                const tx = await xrplEvmChainSigner.transfer(
                    xrplEvmTransferAmount,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    translatedXrplAddress,
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
                    axelar.estimateGasFee.gasLimit,
                );

                await xrplEvmChainSigner.transfer(
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
                    axelar.estimateGasFee.gasLimit,
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
                        translatedXrplAddress,
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
                    axelar.estimateGasFee.gasLimit,
                );

                const tx = await xrplEvmChainSigner.transfer(
                    amount,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    translatedXrplAddress,
                    { gasValue: gasValue },
                );

                await expectAxelarError(tx.hash, axelarScanProvider, AxelarScanProviderErrors.INVALID_TRANSFER_AMOUNT, pollingOpts);
            });

            it("should get stuck at pay gas, when low gasvalue send", async () => {
                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );
                const lowGasValue = BigNumber(gasValue).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();
                const tx = await xrplEvmChainSigner.transfer(
                    xrplEvmTransferAmount,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    translatedXrplAddress,
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
                    axelar.estimateGasFee.gasLimit,
                );
                const lowGasValue = BigNumber(gasValue).times(0.1).integerValue(BigNumber.ROUND_DOWN).toString();
                const tx = await xrplEvmChainSigner.transfer(
                    xrplEvmTransferAmount,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    translatedXrplAddress,
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
                        "r",
                    ),
                    HardhatErrors.INVALID_BYTESLIKE_VALUE,
                );
            });

            it("should truncate amounts with more decimals than supported (>6)", async () => {
                const amount = "2.1234567";
                const expectedAmount = "2.123456";

                const amountAsWei = ethers.parseEther(amount).toString();
                const expectedAmountAsDrops = xrpToDrops(expectedAmount);

                const initialBalance = await xrplChainProvider.getNativeBalance("r");

                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );

                const tx = await xrplEvmChainSigner.transfer(
                    amountAsWei,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    translatedXrplAddress,
                    { gasValue: gasValue },
                );
                const receipt = await tx.wait();

                await expectFullExecution(receipt.hash, axelarScanProvider, pollingOpts);

                await expectBalanceUpdate(
                    async () => (await xrplChainProvider.getNativeBalance("r")).toString(),
                    BigNumber(initialBalance.toString()).plus(expectedAmountAsDrops).toString(),
                    pollingOpts,
                );
            });

            it("should process exact amount when transferring with exactly 6 decimals", async () => {
                const amount = "1.123456";
                const amountAsWei = ethers.parseEther(amount).toString();

                const initialBalance = await xrplChainProvider.getNativeBalance("r");

                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );

                const tx = await xrplEvmChainSigner.transfer(
                    amountAsWei,
                    xrplEvmChain.nativeToken as Token,
                    xrplEvmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    translatedXrplAddress,
                    { gasValue: gasValue },
                );
                const receipt = await tx.wait();

                await expectFullExecution(receipt.hash, axelarScanProvider, pollingOpts);

                await expectBalanceUpdate(
                    async () => (await xrplChainProvider.getNativeBalance("r")).toString(),
                    BigNumber(initialBalance.toString()).plus(xrpToDrops(amount)).toString(),
                    pollingOpts,
                );
            });
        });
    },
);
