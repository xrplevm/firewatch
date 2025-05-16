import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { XrplSigner, XrplSignerErrors } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
import config from "../../../module.config.json";
import { Client, convertStringToHex, dropsToXrp, Wallet, xrpToDrops } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Token } from "@firewatch/core/token";
import { polling } from "@shared/utils";
import BigNumber from "bignumber.js";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { HardhatErrors } from "@testing/hardhat/errors";
import { expectRevert } from "@testing/hardhat/utils";
import { describeOrSkip } from "@testing/mocha/utils";

describeOrSkip(
    "Cross-Chain Native Transfer",
    () => {
        return (
            isChainType(["evm"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainType(["xrp"], config.xrplChain as unknown as AxelarBridgeChain)
        );
    },
    () => {
        const { xrplEvmChain: sourceChain, xrplChain: destinationChain } = config;

        let evmChainProvider: EthersProvider;
        let xrplChainProvider: XrplProvider;

        let evmChainSigner: EthersSigner;
        let xrplChainSigner: XrplSigner;

        let evmJsonProvider: ethers.JsonRpcProvider;
        let xrplClient: Client;

        let evmChainWallet: ethers.Wallet;
        let xrplChainWallet: Wallet;

        let evmChainTranslator: EvmTranslator;
        let xrplChainTranslator: XrpTranslator;

        let gasValue: string;

        before(async () => {
            isChainType(["evm"], sourceChain as unknown as AxelarBridgeChain);
            isChainType(["xrp"], destinationChain as unknown as AxelarBridgeChain);

            evmJsonProvider = new ethers.JsonRpcProvider(sourceChain.urls.rpc);
            xrplClient = new Client(destinationChain.urls.ws);

            evmChainProvider = new EthersProvider(evmJsonProvider);
            xrplChainProvider = new XrplProvider(xrplClient);

            evmChainWallet = new ethers.Wallet(sourceChain.account.privateKey, evmJsonProvider);
            xrplChainWallet = Wallet.fromSeed(destinationChain.account.privateKey);

            evmChainSigner = new EthersSigner(evmChainWallet, evmChainProvider);
            xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

            evmChainTranslator = new EvmTranslator();
            xrplChainTranslator = new XrpTranslator();

            gasValue = ethers.parseEther(sourceChain.interchainTransferOptions.gasValue).toString();
        });

        describeOrSkip(
            "from evm chain to xrpl chain",
            () => {
                return (
                    isChainEnvironment(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain) &&
                    isChainEnvironment(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain)
                );
            },
            () => {
                it("should transfer the token", async () => {
                    const initialSrcBalance = await evmChainProvider.getNativeBalance(evmChainWallet.address);
                    const initialDestBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

                    const amount = sourceChain.interchainTransferOptions.amount;

                    const tx = await evmChainSigner.transfer(
                        amount,
                        sourceChain.nativeToken as Token,
                        sourceChain.interchainTokenServiceAddress,
                        destinationChain.name,
                        "0x" + convertStringToHex(xrplChainWallet.address),
                        {
                            gasValue: gasValue,
                        },
                    );

                    const receipt = await tx.wait();
                    const gasCost = receipt.gasUsed * receipt.gasPrice;

                    const finalSrcBalance = await evmChainProvider.getNativeBalance(evmChainWallet.address);

                    const amountInBase18 = ethers.parseUnits(amount, 18);

                    const expectedSrcBalance = BigNumber(initialSrcBalance)
                        .minus(BigNumber(amountInBase18.toString()))
                        .minus(BigNumber(gasCost.toString()))
                        .minus(BigNumber(gasValue));

                    if (!BigNumber(finalSrcBalance).eq(expectedSrcBalance)) {
                        throw new Error(`Source balance mismatch! Expected: ${expectedSrcBalance}, Actual: ${finalSrcBalance}`);
                    }

                    await polling(
                        async () => {
                            const balance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);
                            return BigNumber(balance.toString()).eq(BigNumber(initialDestBalance.toString()).plus(xrpToDrops(amount)));
                        },
                        (res) => !res,
                        destinationChain.pollingOptions,
                    );
                });

                it("should revert when transferring 0 tokens", async () => {
                    await expectRevert(
                        evmChainSigner.transfer(
                            "0",
                            sourceChain.nativeToken as Token,
                            sourceChain.interchainTokenServiceAddress,
                            destinationChain.name,
                            evmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                        ),
                        HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                    );
                });
            },
        );

        describeOrSkip(
            "from xrpl chain to evm chain",
            () => {
                return (
                    isChainEnvironment(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain) &&
                    isChainEnvironment(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain)
                );
            },
            () => {
                it("should transfer the token", async () => {
                    const erc20 = evmChainProvider.getERC20Contract(sourceChain.nativeToken.address, evmChainWallet);
                    const initialDestBalance = await erc20.balanceOf(evmChainWallet.address);
                    const initialSourceBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

                    const amount = destinationChain.interchainTransferOptions.amount;

                    const tx = await xrplChainSigner.transfer(
                        amount,
                        new Token({} as any),
                        destinationChain.interchainTokenServiceAddress,
                        sourceChain.name,
                        xrplChainTranslator.translate(ChainType.EVM, evmChainWallet.address),
                    );

                    const receipt = await tx.wait();
                    const fee = receipt.fee;

                    const gasValueDrops = (destinationChain.interchainTransferOptions as any).gasValue
                        ? xrpToDrops((destinationChain.interchainTransferOptions as any).gasValue)
                        : "1700000";

                    const gasValueXrp = dropsToXrp(gasValueDrops);
                    const gasValueEth = ethers.parseUnits(gasValueXrp.toString(), 18).toString();

                    await polling(
                        async () => {
                            const balance = await erc20.balanceOf(evmChainWallet.address);

                            const expectedDestBalance = BigNumber(initialDestBalance.toString())
                                .plus(BigNumber(ethers.parseUnits(amount, 18).toString()))
                                .minus(BigNumber(gasValueEth));

                            const isEqual = BigNumber(balance.toString()).eq(expectedDestBalance);

                            return isEqual;
                        },
                        (res) => !res,
                        sourceChain.pollingOptions,
                    );

                    const expectedSourceBalance = BigNumber(initialSourceBalance.toString())
                        .minus(xrpToDrops(amount))
                        .minus(BigNumber(fee.toString()));
                    const finalSrcBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

                    if (!BigNumber(finalSrcBalance.toString()).eq(expectedSourceBalance)) {
                        throw new Error(`Source balance mismatch! Expected: ${expectedSourceBalance}, Actual: ${finalSrcBalance}`);
                    }
                });

                it("should revert when transferring 0 tokens", async () => {
                    await expectRevert(
                        xrplChainSigner.transfer(
                            "0",
                            new Token({} as any),
                            destinationChain.interchainTokenServiceAddress,
                            sourceChain.name,
                            xrplChainTranslator.translate(ChainType.EVM, evmChainWallet.address),
                        ),
                        XrplSignerErrors.TRANSACTION_SUBMISSION_FAILED,
                    );
                });
            },
        );
    },
);
