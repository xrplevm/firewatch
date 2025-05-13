import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner, EthersTransaction } from "@firewatch/bridge/signers/evm/ethers";
import { XrplSigner, XrplSignerErrors } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
import config from "../../../module.config.example.json";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { AxelarScanProvider } from "@firewatch/bridge/providers/axelarscan";
import { Token } from "@firewatch/core/token";
import { polling, PollingOptions } from "@shared/utils";
import BigNumber from "bignumber.js";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { describeOrSkip } from "@testing/mocha/utils";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { InterchainToken } from "@shared/evm/contracts";
import { expectExecuted, expectRevert } from "@testing/hardhat/utils";
import { Env } from "../../../../../packages/env/src/types/env";

describeOrSkip.skip(
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

        let FOO_ERC20: Token;
        let FOO_IOU: Token;

        let xrplEvmChainProvider: EthersProvider;
        let xrplChainProvider: XrplProvider;
        let axelarScanProvider: AxelarScanProvider;

        let xrplEvmChainSigner: EthersSigner;
        let xrplChainSigner: XrplSigner;

        let evmJsonProvider: ethers.JsonRpcProvider;
        let xrplClient: Client;

        let xrplEvmChainWallet: ethers.Wallet;
        let xrplChainWallet: Wallet;
        let secondWallet: Wallet;

        let xrplEvmChainTranslator: EvmTranslator;
        let xrplChainTranslator: XrpTranslator;

        let interchainToken: InterchainToken;

        let xrplTransferAmount: string;
        let xrplEvmTransferAmount: string;
        let xrplEvmAsDropsAmount: string;
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
            secondWallet = Wallet.fromSeed("sEdTqUGVF21kbv8Fen9EZ6vgT1Wm3qW");

            xrplEvmChainSigner = new EthersSigner(xrplEvmChainWallet, xrplEvmChainProvider);
            xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

            xrplEvmChainTranslator = new EvmTranslator();
            xrplChainTranslator = new XrpTranslator();

            FOO_ERC20 = {
                id: "0xc8895f8ceb0cae9da15bb9d2bc5859a184ca0f61c88560488355c8a7364deef8",
                symbol: "FOO",
                decimals: 18,
                name: "FOO",
                address: "0xE26D509C661c4F16FaFfBB1eAce1Fa1CdA8cc146",
                isNative: () => false,
            };

            FOO_IOU = {
                id: "0x85f75bb7fd0753565c1d2cb59bd881970b52c6f06f3472769ba7b48621cd9d23",
                symbol: "FOO",
                decimals: 8,
                name: "FOO",
                address: "rHN7vR4P1qDPGpnLgoXemuZhrm6AchBHvj",
                isNative: () => false,
            };

            interchainToken = new InterchainToken(FOO_ERC20.address!, xrplEvmChainWallet);

            xrplTransferAmount = xrpToDrops(xrplChain.interchainTransferOptions.amount);
            xrplEvmTransferAmount = ethers.parseEther(xrplEvmChain.interchainTransferOptions.amount).toString();
            xrplEvmAsDropsAmount = xrpToDrops(xrplEvmChain.interchainTransferOptions.amount);
            xrplAsWeiAmount = ethers.parseEther(xrplChain.interchainTransferOptions.amount).toString();

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
                    const initialSrcBalance = await xrplChainProvider.getIOUBalance(
                        xrplChainWallet.address,
                        FOO_IOU.address!,
                        FOO_IOU.symbol,
                    );

                    const balance = await interchainToken.balanceOf(xrplEvmChainWallet.address);

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

                    await polling(
                        async () => {
                            const balance = await xrplChainProvider.getIOUBalance(
                                xrplChainWallet.address,
                                FOO_IOU.address!,
                                FOO_IOU.symbol,
                            );
                            return BigNumber(balance.toString()).eq(BigNumber(initialSrcBalance.toString()).plus(xrplEvmAsDropsAmount));
                        },
                        (res) => !res,
                        interchainTransferOptions as PollingOptions,
                    );
                });

                //TODO delete?
                it("should revert when transferring to a non-existent XRPL account without reserve", async () => {
                    const gasValue = await axelarScanProvider.estimateGasFee(
                        xrplEvmChain.name,
                        xrplChain.name,
                        xrplEvmChain.nativeToken.symbol,
                        200_000,
                    );

                    // TODO this expectRevert function won't work need to pull from  AxelarScan
                    await expectRevert(
                        xrplEvmChainSigner.transfer(
                            xrplEvmTransferAmount,
                            FOO_ERC20 as Token,
                            xrplEvmChain.interchainTokenServiceAddress,
                            xrplChain.name,
                            xrplEvmChainTranslator.translate(ChainType.XRP, secondWallet.address),
                            {
                                gasValue: gasValue,
                                gasLimit: gasLimit,
                            },
                        ),
                        //TODO: Update the error message to be more descriptive
                        "fail",
                    );
                });

                it.skip("should revert when transferring 0 tokens", async () => {
                    const gasValue = await axelarScanProvider.estimateGasFee(
                        xrplEvmChain.name,
                        xrplChain.name,
                        xrplEvmChain.nativeToken.symbol,
                        200_000,
                    );
                    await expectRevert(
                        xrplEvmChainSigner.transfer(
                            "0",
                            FOO_ERC20 as Token,
                            xrplEvmChain.interchainTokenServiceAddress,
                            xrplChain.name,
                            xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                            {
                                gasValue: gasValue,
                                gasLimit: gasLimit,
                            },
                        ),
                        "fail",
                    );
                });

                it("should revert when transferring dust amount (below IOU's minimum unit)", async () => {
                    // Get token decimals
                    const decimals = FOO_IOU.decimals;
                    const dustAmount = `0.${"0".repeat(decimals)}1`;

                    const gasValue = await axelarScanProvider.estimateGasFee(
                        xrplEvmChain.name,
                        xrplChain.name,
                        xrplEvmChain.nativeToken.symbol,
                        200_000,
                    );

                    // TODO this expectRevert function won't work need to pull from  AxelarScan
                    await expectRevert(
                        xrplEvmChainSigner.transfer(
                            dustAmount,
                            FOO_ERC20 as Token,
                            xrplEvmChain.interchainTokenServiceAddress,
                            xrplChain.name,
                            xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                            {
                                gasValue: gasValue,
                                gasLimit: gasLimit,
                            },
                        ),
                        //TODO: Update the error message to be more descriptive
                        "fail", // Replace with expected error message
                    );
                });

                it("should revert when transferring more than the balance", async () => {
                    const balance = await interchainToken.balanceOf(xrplEvmChainWallet.address);
                    console.log("Fetched balance from InterchainToken contract:", balance.toString(), xrplEvmChainWallet.address);

                    const amount = BigNumber(balance.toString()).plus(1).toString();

                    await expectRevert(
                        xrplEvmChainSigner.transfer(
                            amount,
                            FOO_ERC20 as Token,
                            xrplEvmChain.interchainTokenServiceAddress,
                            xrplChain.name,
                            xrplEvmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                        ),
                        //TODO: Update the error message to be more descriptive
                        "Insufficient balance for transfer",
                    );
                });

                it("should revert when transferring to an invalid address", async () => {
                    const invalidAddress = "0x123";

                    await expectRevert(
                        xrplEvmChainSigner.transfer(
                            xrplEvmTransferAmount,
                            FOO_ERC20 as Token,
                            xrplEvmChain.interchainTokenServiceAddress,
                            xrplChain.name,
                            xrplEvmChainTranslator.translate(ChainType.XRP, invalidAddress),
                        ),
                        "Invalid recipient address",
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
                    const erc20 = xrplEvmChainProvider.getERC20Contract(FOO_ERC20.address!, xrplEvmChainWallet);
                    const initialDestBalance = await erc20.balanceOf(xrplEvmChainWallet.address);
                    const initialSourceBalance = await xrplChainProvider.getIOUBalance(
                        xrplChainWallet.address,
                        FOO_IOU.address!,
                        FOO_IOU.symbol,
                    );

                    const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                        xrplChain.name,
                        xrplEvmChain.name,
                        xrplChain.nativeToken.symbol,
                        200_000,
                    );

                    const tx = await xrplChainSigner.transfer(
                        xrplTransferAmount,
                        FOO_IOU,
                        xrplChain.interchainTokenServiceAddress,
                        xrplEvmChain.name,
                        xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                    );

                    await expectExecuted(tx.hash, axelarScanProvider, pollingOpts);

                    await polling(
                        async () => {
                            const balance = await erc20.balanceOf(xrplEvmChainWallet.address);
                            console.log("Fetched balance from InterchainToken contract:", balance.toString(), xrplEvmChainWallet.address);
                            return BigNumber(balance.toString()).eq(
                                BigNumber(initialDestBalance.toString()).plus(xrplAsWeiAmount.toString()),
                            );
                        },
                        (done) => !done,
                        interchainTransferOptions as PollingOptions,
                    );

                    const fee = (await tx.wait()).fee; // drops
                    const finalSrcBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);
                    const expected = BigNumber(initialSourceBalance.toString())
                        .minus(BigNumber(xrplTransferAmount))
                        .minus(BigNumber(fee.toString()))
                        .minus(BigNumber(gas_fee_amount));
                    if (!BigNumber(finalSrcBalance.toString()).eq(expected)) {
                        throw new Error(`Source balance mismatch. Expected ${expected}, saw ${finalSrcBalance}`);
                    }
                });

                it("should revert when transferring dust amount (below IOU's minimum unit)", async () => {
                    const decimals = FOO_IOU.decimals;
                    const dustAmount = `0.${"0".repeat(decimals)}1`;

                    const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                        xrplChain.name,
                        xrplEvmChain.name,
                        xrplChain.nativeToken.symbol,
                        200_000,
                    );

                    await expectRevert(
                        xrplChainSigner.transfer(
                            xrpToDrops(dustAmount),
                            FOO_IOU,
                            xrplChain.interchainTokenServiceAddress,
                            xrplChainTranslator.translate("evm", xrplEvmChain.name),
                            xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                            { gasFeeAmount: gas_fee_amount },
                        ),
                        // TODO: Update the error message to be more descriptive
                        XrplSignerErrors.TRANSACTION_SUBMISSION_FAILED,
                    );
                });
                it("should get stuck in confirm step when gas_fee_amount is too low", async () => {
                    const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                        xrplChain.name,
                        xrplEvmChain.name,
                        xrplChain.nativeToken.symbol,
                        200_000,
                    );
                    const lowGasFee = BigNumber(gas_fee_amount).times(0.1).toString();
                    const tx = await xrplChainSigner.transfer(
                        xrplTransferAmount,
                        FOO_IOU,
                        xrplChain.interchainTokenServiceAddress,
                        xrplChainTranslator.translate("evm", xrplEvmChain.name),
                        xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                        { gasFeeAmount: lowGasFee },
                    );

                    await polling(
                        async () => {
                            const insufGas = await axelarScanProvider.fetchOutcome(tx.hash);

                            return insufGas.status === "insufficient_fee";
                        },
                        (res) => !res,
                        pollingOpts,
                    );
                });

                it.skip("should get stuck at Pay Gas, after top-up gas when it doesn't reach threshold", async () => {
                    const gas_fee_amount = await axelarScanProvider.estimateGasFee(
                        xrplChain.name,
                        xrplEvmChain.name,
                        xrplChain.nativeToken.symbol,
                        200_000,
                    );
                    const lowGasFee = BigNumber(gas_fee_amount).times(0.1).toString();

                    const tx = await xrplChainSigner.transfer(
                        xrplTransferAmount,
                        FOO_IOU,
                        xrplChain.interchainTokenServiceAddress,
                        xrplEvmChain.name,
                        xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                        {
                            gasFeeAmount: lowGasFee,
                        },
                    );

                    await polling(
                        async () => {
                            const insufGas = await axelarScanProvider.fetchOutcome(tx.hash);
                            console.log("Insufficient gas outcome:", insufGas);

                            return insufGas.status === "insufficient_fee";
                        },
                        (res) => !res,
                        pollingOpts,
                    );

                    const additionalGas = await xrplChainSigner.addGas(lowGasFee, tx.hash, xrplChain.interchainTokenServiceAddress);
                    await polling(
                        async () => {
                            const insufGas = await axelarScanProvider.fetchOutcome(additionalGas.hash);
                            console.log("Insufficient gas outcome:", insufGas);

                            return insufGas.status === "insufficient_fee";
                        },
                        (res) => !res,
                        pollingOpts,
                    );
                    //TODO: fix error message, check if .status === "insufficient_fee" or just source_gateway_called forever
                    const insufGas = await axelarScanProvider.fetchOutcome(additionalGas.hash);
                    if (insufGas.status !== "insufficient_fee") {
                        throw new Error(`Expected status to be 'insufficient_fee', but got '${insufGas.status}'`);
                    }
                });

                it.skip("should revert when transferring 0 tokens", async () => {
                    await expectRevert(
                        xrplChainSigner.transfer(
                            "0",
                            FOO_IOU,
                            xrplChain.interchainTokenServiceAddress,
                            xrplChainTranslator.translate("evm", xrplEvmChain.name),
                            xrplChainTranslator.translate(ChainType.EVM, xrplEvmChainWallet.address),
                        ),
                        XrplSignerErrors.TRANSACTION_SUBMISSION_FAILED,
                    );
                });
            },
        );
    },
);
