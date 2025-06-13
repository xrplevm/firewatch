import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers } from "ethers";
import config from "../../../module.config.json";
import { Client, Wallet } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { AxelarScanProvider } from "@firewatch/bridge/providers/axelarscan";
import { Token } from "@firewatch/core/token";
import BigNumber from "bignumber.js";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { describeOrSkip } from "@testing/mocha/utils";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { expectXrplFailedDestination, expectFullExecution } from "@firewatch/bridge/utils";
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

        let xrplEvmChainProvider: EthersProvider;
        let xrplChainProvider: XrplProvider;
        let axelarScanProvider: AxelarScanProvider;

        let xrplEvmChainSigner: EthersSigner;

        let evmJsonProvider: ethers.JsonRpcProvider;
        let xrplClient: Client;

        let xrplEvmChainWallet: ethers.Wallet;

        let xrplEvmChainTranslator: EvmTranslator;

        let translatedXrplAddress: string;

        let interchainToken: InterchainToken;

        let xrplEvmTransferAmount: string;

        let gasLimit: number;

        before(async () => {
            evmJsonProvider = new ethers.JsonRpcProvider(xrplEvmChain.urls.rpc);
            xrplClient = new Client(xrplChain.urls.ws);

            xrplEvmChainProvider = new EthersProvider(evmJsonProvider);
            xrplChainProvider = new XrplProvider(xrplClient);
            axelarScanProvider = new AxelarScanProvider(xrplChain.env as Env);

            xrplEvmChainWallet = new ethers.Wallet(xrplEvmChain.accounts.privateKeys[0], evmJsonProvider);

            xrplEvmChainSigner = new EthersSigner(xrplEvmChainWallet, xrplEvmChainProvider);

            xrplEvmChainTranslator = new EvmTranslator();

            translatedXrplAddress = xrplEvmChainTranslator.translate(ChainType.XRP, xrplChain.accounts.addresses[0]);

            erc20 = new Token(xrplEvmChain.erc20);

            interchainToken = new InterchainToken(erc20.address!, xrplEvmChainWallet);

            xrplEvmTransferAmount = ethers.parseUnits(xrplEvmChain.interchainTransferOptions.amount, erc20.decimals).toString();

            gasLimit = xrplEvmChain.interchainTransferOptions.gasLimit;
        });

        describe("from erc20 evm chain to xrpl chain", () => {
            it("should transfer the erc20", async () => {
                const gasValue = await axelarScanProvider.estimateGasFee(
                    xrplEvmChain.name,
                    xrplChain.name,
                    xrplEvmChain.nativeToken.symbol,
                    axelar.estimateGasFee.gasLimit,
                );

                const tx = await interchainToken.interchainTransfer(xrplChain.name, translatedXrplAddress, xrplEvmTransferAmount, "0x", {
                    value: gasValue,
                    gasLimit: gasLimit,
                });
                console.log("tx hash", tx.hash);

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
                        translatedXrplAddress,
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
                        translatedXrplAddress,
                        {
                            gasValue: gasValue,
                            gasLimit: gasLimit,
                        },
                    ),
                    HardhatErrors.TRANSACTION_EXECUTION_REVERTED,
                );
            });
        });
    },
);
